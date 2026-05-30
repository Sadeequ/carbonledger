import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { OracleController } from "./oracle.controller";
import { OracleService } from "./oracle.service";
import { OracleContractClient } from "./oracle-contract.client";
import { OracleSyncService } from "./oracle-sync.service";
import { OracleSchedulerService } from "./oracle-scheduler.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, ScheduleModule.forRoot()],
  controllers: [OracleController],
  providers: [
    OracleService,
    OracleContractClient,
    OracleSyncService,
    OracleSchedulerService,
    PrismaService,
  ],
  exports: [OracleService, OracleSyncService, OracleSchedulerService],
})
export class OracleModule {}
