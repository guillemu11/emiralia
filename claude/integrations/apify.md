# Apify — Integration

**Status:** ✅ Connected

**Service:** Apify Cloud (web scraping platform)

---

## Overview

Apify is Emiralia's scraping engine. We use pre-built Actors to extract property data from:
- **PropertyFinder.ae** (primary source)
- **PanicSelling.xyz** (price drops, distressed sales)

**Why Apify:**
- Pre-built Actors for UAE real estate sites
- Scalable (handles rate limits, retries, proxies)
- Dataset storage + pagination
- Cost-effective ($49/mo for 100K results)

---

## Configuration

**Environment Variables:**
```bash
# .env
APIFY_API_TOKEN=apify_api_...
```

**Actor IDs:**
- **PropertyFinder Scraper:** `apify/propertyfinder-scraper` (community Actor)
- **PanicSelling Scraper:** `apify/web-scraper` (generic, configured for panicselling.xyz)

---

## Health Check

```bash
# Test API key
curl -H "Authorization: Bearer $APIFY_API_TOKEN" \
  https://api.apify.com/v2/acts | jq '.data.total'

# Should return count of available Actors

# Test PropertyFinder Actor
node tools/apify_propertyfinder.js dubai apartment --limit 5
```

---

## Usage

### PropertyFinder Scraper

```bash
# Scrape properties
node tools/apify_propertyfinder.js <location> <propertyType> [--limit N]

# Example
node tools/apify_propertyfinder.js "Dubai Marina" apartment --limit 100
```

**Input Schema:**
```json
{
  "location": "Dubai Marina",
  "propertyType": "apartment",
  "maxResults": 100,
  "proxyConfiguration": { "useApifyProxy": true }
}
```

**Output:** JSON array of properties with:
- `title`, `price`, `location`, `bedrooms`, `bathrooms`, `area`
- `broker`, `imageUrl`, `propertyUrl`
- `postedDate`, `propertyType`

### PanicSelling Scraper

```bash
node tools/apify_panicselling.js [--limit N]
```

**Output:** JSON array of price drops with:
- `property`, `originalPrice`, `currentPrice`, `dropPercentage`
- `location`, `listedDate`

---

## Rate Limits & Costs

| Plan | Monthly Compute | Price | Equivalent Scrapes |
|------|-----------------|-------|-------------------|
| **Free** | $5 compute units | $0 | ~5K properties |
| **Starter** | $49 compute units | $49/mo | ~100K properties |
| **Current** | Starter | $49/mo | ✅ Sufficient for daily scrapes |

**Current Usage:**
- Daily scrape: ~500 properties/day
- Monthly: ~15K properties
- **Utilization:** 15% of plan

---

## Common Issues

### Issue: Actor Run Failed
**Symptoms:** `ACTOR_RUN_FAILED` status

**Solution:**
```bash
# Check run details
node tools/get_apify_run_details.js <runId>

# Common causes:
# - Invalid location (use exact PropertyFinder location names)
# - Rate limit (retry after 1 hour)
# - Proxy blocked (Apify handles this, retry)
```

### Issue: Empty Dataset
**Symptoms:** Run succeeded but 0 results

**Solution:**
- Verify location exists on PropertyFinder.ae
- Check propertyType (apartment, villa, townhouse, penthouse)
- Try broader location (e.g., "Dubai" instead of "Dubai Marina Tower 3")

### Issue: Stale Data
**Symptoms:** Scraped properties are outdated

**Solution:**
```bash
# PropertyFinder updates properties every 6 hours
# Re-scrape if data is > 6 hours old
node tools/apify_propertyfinder.js dubai apartment --limit 1000
```

---

## Related Components

**Used By:**
- [[data-agent]] — orchestrates scraping via `/propertyfinder-scraper` and `/panicselling-scraper`
- [[scrape_propertyfinder]] workflow — scheduled daily 3am

**Tools:**
- [[tools/apify_propertyfinder.js]] — PropertyFinder Actor wrapper
- [[tools/apify_panicselling.js]] — PanicSelling Actor wrapper
- [[tools/find_last_apify_run.js]] — get latest successful run
- [[tools/get_apify_run_details.js]] — inspect run status/errors
- [[tools/fetch_dataset.js]] — download full dataset

**Workflows:**
- [[data-intelligence]] — end-to-end data pipeline
- [[scrape_propertyfinder]] — automated daily scraping

---

## Documentation

- **Official Docs:** https://docs.apify.com/
- **API Reference:** https://docs.apify.com/api/v2
- **PropertyFinder Actor:** https://apify.com/apify/propertyfinder-scraper
- **Pricing:** https://apify.com/pricing