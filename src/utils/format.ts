export function formatMoney(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2,
  }).format(value);
}

export function toBmiResult(heightCm: number, weightKg: number) {
  const value = weightKg / Math.pow(heightCm / 100, 2);
  const label = value < 18.5 ? '偏瘦' : value < 24 ? '正常' : value < 28 ? '超重' : '肥胖';

  return {
    value,
    label,
  };
}
