# v1.8.0

## 29/09/2021

- Add support for different GLAD alert types for a v2 area
- Add support for hosts from `x-rw-domain` header when generating pagination links.
- Update `rw-api-microservice-node` to add CORS support.
- Add support for hosts from `referer` header when generating pagination links.
- Improve error message when updating geostore with invalid application values.
- Remove dependency on CT's `authenticated` functionality
- Replace CT integration library

# v1.7.1

## 11/01/2021

- Fix performance issue when saving and updating areas.

# v1.7.0

## 09/12/2020

- Add new field `geostoreDataApi` to store geostore IDs for the Data API (alongside RW API geostore IDs).
- Add support for sorting on getting areas v2
- Remove area creation per subscription on getting area v2 for user

# v1.6.2

## 17/11/2020

- Fix issue in filtering v2 areas by application.
- Add pagination and sorting to areas v1.
- Add `updatedAt` field to areas v1 and v2.
- For the `/area/fw/:userId` endpoint, automatically set `application` field to `fw` if not set.

# v1.6.1

## 20/07/2020

- Adjust automatic `status` update behavior and tests for it.

# v1.6.0

## 13/07/2020

- Map `confirmed` field when merging subscription data over an area.
- Change nodejs version requirement to v12.16.
- Add override for ADMIN users to be able to view private areas.

# v1.5.1

## 19/05/2020

- Use secondary mongo nodes for read operations.
- Disable mongo unified topology.
- Fix problem where an error saving one area would break the whole sync process.

# v1.5.0

## 24/04/2020

- Modify `/v1/area/fw/:user` so it doesn't return areas without geostore id.
- Add tests for `/v1/area/fw`.

# v1.4.1

## 22/04/2020

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
