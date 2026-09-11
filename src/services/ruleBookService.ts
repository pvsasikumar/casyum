import { GLOBAL_RULE_BOOK } from '../config/ruleBook';

export interface GlobalRuleBookInfo {
  url: string;
  fileName: string;
  version: string;
  updatedAt: string;
  updatedBy: string;
  visible: boolean;
}

export async function fetchGlobalRuleBook(): Promise<GlobalRuleBookInfo> {
  return { ...GLOBAL_RULE_BOOK };
}