import { DashboardRepository, type DashboardData } from "@/lib/repositories/dashboard-repository";
import { MetricsService } from "@/lib/metrics";
import { logger } from "@/lib/logger";

export class DashboardService {
  private repo: DashboardRepository;

  constructor(repo?: DashboardRepository) {
    this.repo = repo ?? new DashboardRepository();
  }

  async getDashboardData(userId: string): Promise<DashboardData | null> {
    return MetricsService.measure("dashboard_service_get", async () => {
      try {
        const data = await this.repo.getDashboardData(userId);
        if (data) {
          MetricsService.increment("dashboard_rpc_hit");
          return data;
        }
        MetricsService.increment("dashboard_rpc_miss");
        return null;
      } catch (e) {
        logger.error("DashboardService.getDashboardData error", { error: String(e) });
        MetricsService.increment("dashboard_service_error");
        return null;
      }
    });
  }
}
