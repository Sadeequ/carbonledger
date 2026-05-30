import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { RedisService } from "../redis.service";
import { CreateListingDto, PurchaseDto, BulkPurchaseDto } from "./marketplace.dto";
import { randomBytes } from "crypto";

/** TTL for the listings cache in seconds (60 s per spec). */
const LISTINGS_TTL = 60;

/** Prefix for all listing-related cache keys. */
const LISTINGS_KEY_PREFIX = "marketplace:listings";

type ListingFilters = {
  methodology?: string;
  vintage?: number;
  country?: string;
  minPrice?: string;
  maxPrice?: string;
};

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── helpers ────────────────────────────────────────────────────────────────

  /** Builds a deterministic cache key from the active filter set. */
  private buildCacheKey(filters: ListingFilters): string {
    const parts = [
      filters.methodology ?? "",
      filters.vintage     ?? "",
      filters.country     ?? "",
      filters.minPrice    ?? "",
      filters.maxPrice    ?? "",
    ];
    return `${LISTINGS_KEY_PREFIX}:${parts.join("|")}`;
  }

  /** Invalidates every cached listings page (all filter combinations). */
  private async invalidateListingsCache(): Promise<void> {
    await this.redis.delByPattern(`${LISTINGS_KEY_PREFIX}:*`);
  }

  // ─── public API ─────────────────────────────────────────────────────────────

  /**
   * Returns active listings, serving from Redis when available.
   * Also returns a `cacheHit` flag so the controller can set X-Cache.
   */
  async findAll(
    filters: ListingFilters,
  ): Promise<{ data: unknown[]; cacheHit: boolean }> {
    const key = this.buildCacheKey(filters);

    // 1. Try cache
    const cached = await this.redis.get<unknown[]>(key);
    if (cached !== null) {
      return { data: cached, cacheHit: true };
    }

    // 2. Cache miss – read from DB
    const data = await this.prisma.marketListing.findMany({
      where: {
        status: { in: ["Active", "PartiallyFilled"] },
        ...(filters.methodology && { methodology: filters.methodology }),
        ...(filters.vintage     && { vintageYear: filters.vintage }),
        ...(filters.country     && { country: filters.country }),
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Populate cache (fire-and-forget; failure is non-fatal)
    await this.redis.set(key, data, LISTINGS_TTL);

    return { data, cacheHit: false };
  }

  async findOne(listingId: string) {
    const l = await this.prisma.marketListing.findUnique({ where: { listingId } });
    if (!l) throw new NotFoundException(`Listing ${listingId} not found`);
    return l;
  }

  async createListing(dto: CreateListingDto) {
    const listing = await this.prisma.marketListing.create({ data: dto });
    // Invalidate so the new listing appears immediately on next request
    await this.invalidateListingsCache();
    return listing;
  }

  async delistListing(listingId: string) {
    await this.findOne(listingId);
    const updated = await this.prisma.marketListing.update({
      where: { listingId },
      data:  { status: "Delisted" },
    });
    // Invalidate so the delisted listing disappears immediately
    await this.invalidateListingsCache();
    return updated;
  }

  async purchase(dto: PurchaseDto) {
    const listing = await this.findOne(dto.listingId);
    if (!["Active", "PartiallyFilled"].includes(listing.status)) {
      throw new BadRequestException("Listing is not available");
    }
    if (dto.amount > listing.amountAvailable) {
      throw new BadRequestException("Insufficient credits in listing");
    }

    const newAmount = listing.amountAvailable - dto.amount;
    const newStatus = newAmount === 0 ? "Sold" : "PartiallyFilled";

    await this.prisma.marketListing.update({
      where: { listingId: dto.listingId },
      data:  { amountAvailable: newAmount, status: newStatus },
    });

    return {
      txHash:  randomBytes(32).toString("hex"),
      batchId: listing.batchId,
      amount:  dto.amount,
    };
  }

  async bulkPurchase(dto: BulkPurchaseDto) {
    const results = [];
    for (let i = 0; i < dto.listingIds.length; i++) {
      const result = await this.purchase({
        listingId:      dto.listingIds[i],
        amount:         dto.amounts[i],
        buyerPublicKey: dto.buyerPublicKey,
      });
      results.push(result);
    }
    return results;
  }
}
