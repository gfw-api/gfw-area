## 16/03/2020

- Fix all=true filter for v2 areas router - using endpoint to find all subscriptions in MS Subscriptions.
- Fix problem with ids of subscriptions returned as areas.

# v1.1.0

## 06/03/2020

- Update the substitution data sent to the email service when creating/editing v2 areas.
- Re-apply filters after merging areas with subscriptions

# v1.0.0

## 28/02/2020

- Add notification emails being sent after area creation, update and bulk update.
- Add Areas v2 router, which syncs areas of interest with subscriptions from the GFW Subscriptions API MS. For more information about this feature, check the docs.
- Fix issue where creating areas would not save the thumbnail.
- Fix scenarios where PATCH a v1 area would fail to identify the user or properly handle the data.
- Fix issue where areas export would not function properly.
