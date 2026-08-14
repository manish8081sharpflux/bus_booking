const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100

function normalizeRule(row) {
  return {
    id: row.id,
    name: row.name,
    ruleType: String(row.rule_type || '').toUpperCase(),
    adjustmentType: String(row.adjustment_type || '').toUpperCase(),
    adjustmentValue: Number(row.adjustment_value || 0),
    condition: row.condition_json || {},
    priority: Number(row.priority || 100),
  }
}

function ruleMatches(rule, context) {
  const condition = rule.condition || {}
  switch (rule.ruleType) {
    case 'WEEKEND': {
      const days = Array.isArray(condition.days) && condition.days.length ? condition.days.map(Number) : [0, 6]
      return days.includes(context.departure.getDay())
    }
    case 'DATE': {
      const date = context.departure.toISOString().slice(0, 10)
      const dates = Array.isArray(condition.dates) ? condition.dates.map(String) : condition.date ? [String(condition.date)] : []
      return dates.includes(date)
    }
    case 'OCCUPANCY': {
      const min = Number(condition.minPercent ?? condition.minOccupancy ?? 0)
      const max = Number(condition.maxPercent ?? condition.maxOccupancy ?? 100)
      return context.occupancyPercent >= min && context.occupancyPercent <= max
    }
    case 'LAST_MINUTE': {
      const maxHours = Number(condition.hoursBefore ?? condition.maxHoursBefore ?? 24)
      const minHours = Number(condition.minHoursBefore ?? 0)
      return context.hoursBeforeDeparture >= minHours && context.hoursBeforeDeparture <= maxHours
    }
    default:
      return false
  }
}

function applyAdjustment(amount, rule) {
  const value = Number(rule.adjustmentValue || 0)
  if (rule.adjustmentType === 'PERCENTAGE') return roundMoney(amount * (1 + value / 100))
  if (rule.adjustmentType === 'FIXED') return roundMoney(amount + value)
  return amount
}

function evaluateFare({ baseFare, rules = [], departureAt, totalSeats = 0, availableSeats = 0, now = new Date() }) {
  const departure = new Date(departureAt)
  const hoursBeforeDeparture = Math.max(0, (departure.getTime() - now.getTime()) / 3600000)
  const occupiedSeats = Math.max(0, Number(totalSeats) - Number(availableSeats))
  const occupancyPercent = totalSeats > 0 ? (occupiedSeats / Number(totalSeats)) * 100 : 0
  const context = { departure, hoursBeforeDeparture, occupancyPercent, totalSeats: Number(totalSeats), availableSeats: Number(availableSeats) }

  const applicable = rules
    .filter(row => row.is_active !== false)
    .map(normalizeRule)
    .sort((a, b) => a.priority - b.priority)
    .filter(rule => ruleMatches(rule, context))

  let fare = roundMoney(baseFare)
  const appliedRules = []
  for (const rule of applicable) {
    const before = fare
    fare = Math.max(0, applyAdjustment(fare, rule))
    appliedRules.push({ ...rule, before, after: fare, delta: roundMoney(fare - before) })
  }

  return {
    baseFare: roundMoney(baseFare),
    finalFare: roundMoney(fare),
    adjustmentAmount: roundMoney(fare - Number(baseFare)),
    appliedRules,
    context: {
      occupancyPercent: roundMoney(occupancyPercent),
      hoursBeforeDeparture: roundMoney(hoursBeforeDeparture),
    },
  }
}

module.exports = { evaluateFare, roundMoney }
