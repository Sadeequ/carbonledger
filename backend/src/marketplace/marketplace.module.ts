import { Module } from "@nestjs/common";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { PrismaService } from "../prisma.service";
import { RedisService } from "../redis.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, PrismaService, RedisService],
})
export class MarketplaceModule {}
