import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Res } from "@nestjs/common";
import { Response } from "express";
import { AuthGuard } from "@nestjs/passport";
import { MarketplaceService } from "./marketplace.service";
import { CreateListingDto, PurchaseDto, BulkPurchaseDto } from "./marketplace.dto";

@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get("listings")
  async findAll(
    @Res({ passthrough: true }) res: Response,
    @Query("methodology") methodology?: string,
    @Query("vintage")     vintage?: string,
    @Query("country")     country?: string,
    @Query("minPrice")    minPrice?: string,
    @Query("maxPrice")    maxPrice?: string,
  ) {
    const { data, cacheHit } = await this.marketplaceService.findAll({
      methodology,
      vintage: vintage ? Number(vintage) : undefined,
      country,
      minPrice,
      maxPrice,
    });

    res.setHeader("X-Cache", cacheHit ? "HIT" : "MISS");
    return data;
  }

  @Get("listings/:id")
  findOne(@Param("id") id: string) {
    return this.marketplaceService.findOne(id);
  }

  @Post("list")
  @UseGuards(AuthGuard("jwt"))
  createListing(@Body() dto: CreateListingDto) {
    return this.marketplaceService.createListing(dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"))
  delist(@Param("id") id: string) {
    return this.marketplaceService.delistListing(id);
  }

  @Post("purchase")
  @UseGuards(AuthGuard("jwt"))
  purchase(@Body() dto: PurchaseDto) {
    return this.marketplaceService.purchase(dto);
  }

  @Post("bulk-purchase")
  @UseGuards(AuthGuard("jwt"))
  bulkPurchase(@Body() dto: BulkPurchaseDto) {
    return this.marketplaceService.bulkPurchase(dto);
  }
}
