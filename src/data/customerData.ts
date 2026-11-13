export interface CustomerRecord {
  customer_id: string;
  gender: 'Female' | 'Male' | 'Other';
  age: number;
  city: 'New York' | 'Los Angeles' | 'Chicago' | 'San Francisco' | 'Houston' | 'Miami';
  membership_type: 'Bronze' | 'Silver' | 'Gold';
  total_spend: number;
  items_purchased: number;
  average_rating: number;
  discount_applied: boolean;
  days_since_last_purchase: number;
  satisfaction_level: 'Satisfied' | 'Neutral' | 'Unsatisfied';
  churn_risk_score?: number;
  cluster_name?: string;
}

export interface StreamingTransaction {
  event_id: string;
  timestamp: string;
  customer_id: string;
  city: 'New York' | 'Los Angeles' | 'Chicago' | 'San Francisco' | 'Houston' | 'Miami';
  membership_type: 'Bronze' | 'Silver' | 'Gold';
  amount: number;
  items_count: number;
  rating: number;
  is_anomaly: boolean;
  anomaly_reason?: string;
  partition: number;
  offset: number;
}

// Deterministic seed helper
function createCustomerDataset(count: number = 380): CustomerRecord[] {
  const cities: CustomerRecord['city'][] = [
    'New York',
    'Los Angeles',
    'Chicago',
    'San Francisco',
    'Houston',
    'Miami',
  ];
  const genders: CustomerRecord['gender'][] = ['Female', 'Male', 'Female', 'Male', 'Other'];
  const memberships: CustomerRecord['membership_type'][] = ['Bronze', 'Silver', 'Gold'];

  const records: CustomerRecord[] = [];

  for (let i = 1; i <= count; i++) {
    // Generate realistic correlated data
    const id = `CUST-${1000 + i}`;
    const gender = genders[(i * 7 + 3) % genders.length];
    const city = cities[(i * 13 + 5) % cities.length];
    
    // Age roughly between 20 and 65
    const age = 20 + ((i * 19 + 7) % 46);
    
    // Membership distribution: 45% Bronze, 35% Silver, 20% Gold
    const mIdx = (i * 11) % 100;
    const membership: CustomerRecord['membership_type'] = 
      mIdx < 45 ? 'Bronze' : (mIdx < 80 ? 'Silver' : 'Gold');

    // Shopping behavior based on membership & age
    const baseMultiplier = membership === 'Gold' ? 3.2 : (membership === 'Silver' ? 1.8 : 1.0);
    const ageMultiplier = age > 35 ? 1.25 : 0.95;
    
    const items_purchased = Math.max(1, Math.floor((3 + ((i * 17) % 15)) * (membership === 'Gold' ? 1.6 : 1.0)));
    const avgItemPrice = 35 + ((i * 23) % 85);
    const total_spend = Math.round(items_purchased * avgItemPrice * baseMultiplier * ageMultiplier);
    
    const discount_applied = (i * 29) % 100 < 58;

    // Recency (days since last purchase): 1 to 120 days
    // Make churn correlate with recency and satisfaction
    const days_since_last_purchase = 1 + ((i * 31 + 13) % 118);

    // Rating
    let baseRating = 3.5;
    if (membership === 'Gold') baseRating += 0.7;
    if (days_since_last_purchase > 60) baseRating -= 0.8;
    if (discount_applied) baseRating += 0.3;
    const ratingNoise = (((i * 41) % 20) - 10) / 10;
    const average_rating = Math.min(5.0, Math.max(1.0, Number((baseRating + ratingNoise).toFixed(1))));

    // Satisfaction level derivation (ground truth for classification)
    let satisfaction_score = 0;
    satisfaction_score += average_rating * 1.5;
    satisfaction_score -= (days_since_last_purchase / 35);
    if (membership === 'Gold') satisfaction_score += 1.2;
    if (membership === 'Silver') satisfaction_score += 0.5;
    if (discount_applied) satisfaction_score += 0.6;
    if (total_spend > 2000) satisfaction_score += 0.8;

    let satisfaction_level: CustomerRecord['satisfaction_level'] = 'Neutral';
    if (satisfaction_score >= 5.5) {
      satisfaction_level = 'Satisfied';
    } else if (satisfaction_score <= 3.2) {
      satisfaction_level = 'Unsatisfied';
    } else {
      satisfaction_level = 'Neutral';
    }

    // Churn Risk Score (0 - 100)
    let risk = (days_since_last_purchase / 120) * 55;
    if (satisfaction_level === 'Unsatisfied') risk += 35;
    else if (satisfaction_level === 'Neutral') risk += 15;
    else risk -= 10;

    if (membership === 'Gold') risk -= 10;
    if (average_rating < 3.0) risk += 15;
    const churn_risk_score = Math.min(99, Math.max(5, Math.round(risk)));

    // Cluster Assignment
    let cluster_name = 'Standard Casuals';
    if (total_spend > 2500 && membership === 'Gold') {
      cluster_name = 'High-Value VIPs';
    } else if (items_purchased > 15 && discount_applied) {
      cluster_name = 'Frequent Bargain Hunters';
    } else if (churn_risk_score > 70) {
      cluster_name = 'Churn Candidates';
    } else if (membership === 'Silver' && total_spend > 1200) {
      cluster_name = 'Steady Core Shoppers';
    }

    records.push({
      customer_id: id,
      gender,
      age,
      city,
      membership_type: membership,
      total_spend,
      items_purchased,
      average_rating,
      discount_applied,
      days_since_last_purchase,
      satisfaction_level,
      churn_risk_score,
      cluster_name,
    });
  }

  return records;
}

export const INITIAL_CUSTOMERS: CustomerRecord[] = createCustomerDataset(380);

export interface ClusterSummary {
  name: string;
  count: number;
  avgSpend: number;
  avgItems: number;
  avgDaysSince: number;
  dominantMembership: string;
  churnRate: number;
  description: string;
}

export function computeClusterSummaries(data: CustomerRecord[]): ClusterSummary[] {
  const clusters: { [key: string]: CustomerRecord[] } = {};
  data.forEach(c => {
    const key = c.cluster_name || 'Standard Casuals';
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(c);
  });

  return Object.entries(clusters).map(([name, group]) => {
    const count = group.length;
    const totalSpend = group.reduce((s, c) => s + c.total_spend, 0);
    const totalItems = group.reduce((s, c) => s + c.items_purchased, 0);
    const totalDays = group.reduce((s, c) => s + c.days_since_last_purchase, 0);
    const atRiskCount = group.filter(c => (c.churn_risk_score || 0) >= 65).length;

    const mCounts: Record<string, number> = {};
    group.forEach(c => {
      mCounts[c.membership_type] = (mCounts[c.membership_type] || 0) + 1;
    });
    const dominant = Object.entries(mCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bronze';

    let description = '';
    if (name === 'High-Value VIPs') {
      description = 'Top tier spenders with Gold membership, high lifetime value, and priority service requirements.';
    } else if (name === 'Frequent Bargain Hunters') {
      description = 'High basket volume heavily driven by discount codes and promotional campaigns.';
    } else if (name === 'Churn Candidates') {
      description = 'Long inactivity (>45 days) combined with neutral or low satisfaction scores requiring urgent retention.';
    } else if (name === 'Steady Core Shoppers') {
      description = 'Predictable mid-tier purchasers with balanced order frequencies and moderate average spend.';
    } else {
      description = 'Occasional shoppers with exploratory basket sizes and moderate brand loyalty.';
    }

    return {
      name,
      count,
      avgSpend: Math.round(totalSpend / count),
      avgItems: Number((totalItems / count).toFixed(1)),
      avgDaysSince: Math.round(totalDays / count),
      dominantMembership: dominant,
      churnRate: Math.round((atRiskCount / count) * 100),
      description,
    };
  });
}

// Logistic Regression Inference Engine (Spark ML emulation)
export interface ModelWeights {
  intercept: number;
  age: number;
  total_spend: number;
  items_purchased: number;
  average_rating: number;
  days_since_last_purchase: number;
  discount_applied: number;
  membership_gold: number;
  membership_silver: number;
}

export const TRAINED_MODEL_WEIGHTS: ModelWeights = {
  intercept: -2.15,
  age: 0.012,
  total_spend: 0.00065,
  items_purchased: 0.045,
  average_rating: 1.25,
  days_since_last_purchase: -0.058,
  discount_applied: 0.42,
  membership_gold: 0.85,
  membership_silver: 0.35,
};

export function predictSatisfaction(
  features: {
    age: number;
    total_spend: number;
    items_purchased: number;
    average_rating: number;
    days_since_last_purchase: number;
    discount_applied: boolean;
    membership_type: 'Bronze' | 'Silver' | 'Gold';
  }
): {
  prediction: 'Satisfied' | 'Neutral' | 'Unsatisfied';
  probabilities: {
    satisfied: number;
    neutral: number;
    unsatisfied: number;
  };
  logOdds: number;
} {
  const w = TRAINED_MODEL_WEIGHTS;
  let logit = w.intercept;
  logit += features.age * w.age;
  logit += features.total_spend * w.total_spend;
  logit += features.items_purchased * w.items_purchased;
  logit += features.average_rating * w.average_rating;
  logit += features.days_since_last_purchase * w.days_since_last_purchase;
  logit += (features.discount_applied ? 1 : 0) * w.discount_applied;
  if (features.membership_type === 'Gold') logit += w.membership_gold;
  if (features.membership_type === 'Silver') logit += w.membership_silver;

  // Multi-threshold sigmoid mapping
  const pSatisfied = 1 / (1 + Math.exp(-(logit - 0.5)));
  const pUnsatisfied = 1 / (1 + Math.exp(logit + 1.2));
  let pNeutral = Math.max(0.05, 1 - pSatisfied - pUnsatisfied);

  // Normalize
  const total = pSatisfied + pNeutral + pUnsatisfied;
  const normSat = pSatisfied / total;
  const normNeu = pNeutral / total;
  const normUnsat = pUnsatisfied / total;

  let prediction: 'Satisfied' | 'Neutral' | 'Unsatisfied' = 'Neutral';
  if (normSat > normNeu && normSat > normUnsat) prediction = 'Satisfied';
  else if (normUnsat > normSat && normUnsat > normNeu) prediction = 'Unsatisfied';
  else prediction = 'Neutral';

  return {
    prediction,
    probabilities: {
      satisfied: Math.round(normSat * 100),
      neutral: Math.round(normNeu * 100),
      unsatisfied: Math.round(normUnsat * 100),
    },
    logOdds: Number(logit.toFixed(2)),
  };
}
