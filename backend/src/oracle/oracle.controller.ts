import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OracleService, SubmitMonitoringDto, UpdatePriceDto, FlagProjectDto } from "./oracle.service";
import { OracleSyncService } from "./oracle-sync.service";
import { OracleSchedulerService } from "./oracle-scheduler.service";

@Controller("oracle")
export class OracleController {
  constructor(
    private readonly oracleService: OracleService,
    private readonly oracleSyncService: OracleSyncService,
    private readonly oracleSchedulerService: OracleSchedulerService
  ) {}

  @Post("monitoring")
  @UseGuards(AuthGuard("jwt"))
  submitMonitoring(@Body() dto: SubmitMonitoringDto) {
    return this.oracleService.submitMonitoring(dto);
  }

  @Post("price")
  @UseGuards(AuthGuard("jwt"))
  updatePrice(@Body() dto: UpdatePriceDto) {
    return { received: true, ...dto };
  }

  @Get("status/:projectId")
  getStatus(@Param("projectId") projectId: string) {
    return this.oracleService.getStatus(projectId);
  }

  @Post("flag")
  @UseGuards(AuthGuard("jwt"))
  flagProject(@Body() dto: FlagProjectDto) {
    return this.oracleService.flagProject(dto);
  }

  @Get("sync/state")
  async getSyncState() {
    return this.oracleSyncService.getSyncState();
  }

  @Post("sync/trigger")
  @UseGuards(AuthGuard("jwt"))
  async triggerSync() {
    return this.oracleSyncService.triggerManualSync();
  }

  @Get("sync/health")
  async getSyncHealth() {
    return this.oracleSchedulerService.getSchedulerHealth();
  }

  @Post("sync/reset")
  @UseGuards(AuthGuard("jwt"))
  async resetSync() {
    await this.oracleSyncService.resetSyncState();
    return { message: "Sync state reset successfully" };
  }
}
