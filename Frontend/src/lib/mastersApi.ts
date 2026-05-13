import { apiFetch } from "./api";

export type MasterNoShowStat = {
  master_id: number;
  full_name: string;
  completed_count: number;
  no_show_count: number;
  no_show_rate_percent: number | null;
};

export async function fetchMasterNoShowStats(): Promise<MasterNoShowStat[]> {
  return apiFetch<MasterNoShowStat[]>("/api/masters/no-show-stats/");
}
