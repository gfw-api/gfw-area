# v.1.4.1

## 23/04/2020

- Fix so that the correct params are provided to Subscriptions MS when creating the subscription associated to the area

# v1.4.0

## 20/04/2020

- Modify `/v1/area/fw` so it doesn't return areas without geostore id.
- Add tests for `/v1/area/fw`.

# v1.3.0

## 09/04/2020

- Add node affinity to kubernetes configuration.

## 02/04/2020

- Minor fixes in the merging of areas with subscription information (prioritizing information of the area).

# v1.2.0

## 23/03/2020

- Add endpoint for synchronizing areas and subscriptions.
- Updated GET v2/area?all=true to use pagination.

# v1.1.1

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
