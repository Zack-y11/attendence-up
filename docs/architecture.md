# Architecture

Attendence-Up is a modular monolith. The Fastify API owns authorization, the attendance window, duplicate rules, and distance. The React app collects input and renders it.

## Identity

Clerk handles instructor signup, login, and logout. Private API calls send the Clerk session token as `Authorization: Bearer`. The API verifies it with the Clerk secret key.

The local `User` row is created the first time that instructor calls the API. Its primary key is the Clerk user id. Classes and sessions belong to that row, so ownership checks stay in the database even though passwords do not.

`GET /api/me` refreshes the cached name and email from Clerk. Other private requests reuse the local row.

Public attendance routes do not use Clerk. A future student account can be another Clerk user whose role is stored on `User`; v1 only writes `INSTRUCTOR`.

## One attendance pipeline

`AttendanceSession.classId` is optional.

- A class session points at a `Class` owned by the same instructor.
- A standalone session leaves `classId` null.

Both use `AttendanceRecord`. There is no second attendance table.

`classId` cannot be changed after creation. A session can be edited while it is `DRAFT` or `OPEN`, and is frozen while `CLOSED`. Reopening returns it to `OPEN`.

`startsAt` and `endsAt` are the schedule. `attendanceOpensAt` and `attendanceClosesAt` are the optional check-in window. Students can submit only when the status is `OPEN` and the current time is inside that window, if one is set.

The public URL uses `publicToken`, a 128-bit random value, at `/attendance/{publicToken}`. The internal session id stays private. A later QR code can encode the same URL. A later expiring token can be a new table beside this stable token.

Duplicate registration is rejected with `(sessionId, studentCode)`. The code is stored trimmed and uppercased, so `sm001` and `SM001` are the same student for that session.

## Location

The browser is asked for location once, and only when the session has a classroom location. The page explains why. Denial still allows submit.

The server computes distance with the Haversine formula. Status is separate from attendance:

1. No student coordinates: `LOCATION_UNAVAILABLE`
2. No classroom location: `NO_EXPECTED_LOCATION`
3. Accuracy worse than 100 meters: `LOW_ACCURACY` (distance is still stored)
4. Distance within the radius: `WITHIN_RADIUS`
5. Otherwise: `OUTSIDE_RADIUS`

None of these statuses reject the record. A future `requireLocation` flag can change that without redesigning the record.

Classroom coordinates are stored only when latitude, longitude, and radius are all present. The database enforces that with a check constraint. Creating a class session copies the class default when the request omits location.

Exports omit latitude and longitude unless the instructor selects those columns. Excel and PDF share one column allowlist and one table builder, so another format can reuse the same rows.

## Authorization

Every class and session query filters by the instructor id from the verified Clerk session. Hiding a link in the UI is not the control. Another instructor receives 404 for a resource they do not own.

The public payload includes the session name, description, class name, whether check-in is open, and whether location will be requested. It does not include the instructor's email or the classroom coordinates.
