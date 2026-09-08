# GYMMIS backend: Postman manual testing guide

This guide is derived from the current Express routes, controllers, Prisma schema, and
seed script. It does not add endpoints described only in the SRS.

## 0. Start the API and prepare Postman

From `backend`:

```powershell
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

The seeded owner is:

```text
username: owner
email: owner@gymmis.com
password: admin123
```

The seed script deletes and recreates the development data. Do not run it against data
you need to keep.

Create a Postman environment named `GYMMIS local` with these initial variables:

| Variable | Initial value |
|---|---|
| `baseUrl` | `http://localhost:5000` |
| `ownerToken` | empty |
| `ownerRefreshToken` | empty |
| `memberToken` | empty |
| `memberRefreshToken` | empty |
| `ownerUserId` | empty |
| `memberUserId` | empty |
| `memberId` | empty |
| `packageId` | empty |
| `membershipId` | empty |
| `paymentId` | empty |
| `attendanceId` | empty |
| `trainerId` | empty |
| `trainerUserId` | empty |
| `assignmentId` | empty |
| `sessionId` | empty |
| `expenseId` | empty |
| `notificationId` | empty |
| `secondUserId` | empty |

For JSON requests, use `Body > raw > JSON` and add `Content-Type: application/json`.
For protected requests add:

```text
Authorization: Bearer {{ownerToken}}
```

## 1. API conventions and exact shared errors

All application routes are under `{{baseUrl}}/api`.

Protected routes without `Authorization: Bearer <token>` return:

```json
{"success":false,"message":"Authentication required. Please log in."}
```

Status: `401`.

An invalid or expired access token returns:

```json
{"success":false,"message":"Invalid or expired token."}
```

Status: `401`.

A valid token with a role not allowed by the route returns status `403`:

```json
{
  "success": false,
  "message": "Access denied. Requires one of: [OWNER, MANAGER]"
}
```

The exact allowed-role list depends on the route. Controller validation errors use
status `400` and `{ "success": false, "message": "..." }`. Missing records use status
`404` and the controller's message. There is no general `409` handler in the current
code; duplicate/conflict checks implemented by controllers return `400`.

## 2. Authentication and tokens

### 2.1 Health and root smoke tests

1. `GET {{baseUrl}}/`

   No auth or body.

   Expected `200`:

   ```json
   {
     "message": "🏋️‍♂️ Welcome to GYMMIS - Gym Management Information System API",
     "documentation": "/api/health",
     "status": "Operational"
   }
   ```

2. `GET {{baseUrl}}/api/health`

   No auth or body.

   Expected `200` when PostgreSQL is reachable:

   ```json
   {
     "status": "online",
     "timestamp": "<ISO date>",
     "service": "GYMMIS Core API (Chagni Gym)",
     "version": "1.0.0",
     "environment": "development",
     "database": {"connected": true}
   }
   ```

   A database failure is expected to be `503` with `status: "degraded"` and
   `database.connected: false`.

### 2.2 Owner login

3. `POST {{baseUrl}}/api/auth/login`

   No auth. Body:

   ```json
   {"usernameOrEmail":"owner","password":"admin123"}
   ```

   Expected `200`:

   ```json
   {
     "success": true,
     "message": "Login successful",
     "token": "<JWT>",
     "refreshToken": "<JWT>",
     "user": {
       "id": "<id>",
       "email": "owner@gymmis.com",
       "username": "owner",
       "role": "OWNER",
       "fullName": "Abebe Bikila",
       "phone": "<string or null>",
       "avatarUrl": "<string or null>",
       "memberProfile": null,
       "trainerProfile": null
     }
   }
   ```

   Save `token` as `ownerToken`, `refreshToken` as `ownerRefreshToken`, and
   `user.id` as `ownerUserId`.

4. Negative login: repeat the request with `{}`. Expected `400`:
   `Username/Email and Password are required`.

5. Negative login: use the correct username and a wrong password. Expected `401`:
   `Invalid credentials`.

6. `POST {{baseUrl}}/api/auth/refresh`

   No auth. Body:

   ```json
   {"refreshToken":"{{ownerRefreshToken}}"}
   ```

   Expected `200`: `{ "success": true, "token": "<JWT>", "refreshToken": "<JWT>" }`.
   Missing `refreshToken` is `400`; an invalid refresh token is `401`.

### 2.3 Authenticated profile

7. `GET {{baseUrl}}/api/auth/me`

   Owner auth, no body. Expected `200` with:
   `{ success: true, user: { id, email, username, role, status, fullName, phone,
   avatarUrl, memberProfile, trainerProfile } }`.

8. `PATCH {{baseUrl}}/api/auth/me`

   Owner auth. Body may contain only these optional fields:

   ```json
   {"fullName":"Abebe Updated","phone":"+251900000000","avatarUrl":"https://example.com/avatar.png"}
   ```

   `photo` is also accepted as an alias for `avatarUrl`. Expected `200`:
   `{ success: true, message: "Profile updated successfully", user: {...} }`.
   `{"fullName":""}` is `400` with `Full name cannot be empty`.

9. `POST {{baseUrl}}/api/auth/change-password`

   Owner auth. Body:

   ```json
   {"currentPassword":"admin123","newPassword":"admin1234"}
   ```

   Expected `200`: `{ success: true, message: "Password changed successfully" }`.
   Missing fields, a new password shorter than six characters, or a wrong current
   password return `400`. Use the new password for subsequent owner logins.

## 3. Create the member and obtain the member token

The seed creates an owner, one active package (`Elite VIP Annual`), and a trainer
record. It does **not** create a demo member or a member login. The SRS requires that
only an Owner or Manager can create a member, so the registration endpoint below is
protected and must be called with an Owner or Manager token. Then log in with the
generated member username/password.

10. `GET {{baseUrl}}/api/packages`

    No auth. Expected `200`:
    `{ success: true, count: <number>, packages: [<package objects>] }`.
    Save the seeded package object's `id` as `packageId`.

11. `POST {{baseUrl}}/api/members`

    Owner or Manager auth:
    `Authorization: Bearer {{ownerToken}}`

    Body:

    ```json
    {
      "fullName":"Demo Member",
      "gender":"FEMALE",
      "dateOfBirth":"1995-06-15",
      "phone":"+251911000001",
      "address":"Chagni",
      "photo":"https://example.com/member-photo.jpg",
      "email":"demo.member@example.com",
      "emergencyContact":"+251911000002",
      "initialPackageId":"{{packageId}}",
      "password":"member123",
      "username":"demo_member"
    }
    ```

    `fullName`, `phone`, `gender`, and `password` are required. The other fields are
    optional. Password must have at least six characters and contain letters and
    numbers.

    Expected `201`:

    ```json
    {
      "success": true,
      "message": "Member registered successfully. Login account and membership are active.",
      "member": {
        "id":"<generated member id>",
        "userId":"<generated user id>",
        "memberCode":"CHG-<number>",
        "fullName":"Demo Member",
        "gender":"FEMALE",
        "dateOfBirth":"1995-06-15T00:00:00.000Z",
        "phone":"+251911000001",
        "email":"demo.member@example.com",
        "address":"Chagni",
        "photo":"https://example.com/member-photo.jpg",
        "emergencyContact":"+251911000002",
        "status":"ACTIVE",
        "qrCode":"<generated QR payload>",
        "registrationDate":"<generated ISO date>",
        "createdAt":"<generated ISO date>",
        "updatedAt":"<generated ISO date>"
      },
      "user": {"id":"<id>","username":"demo_member","email":"demo.member@example.com","role":"MEMBER"}
    }
    ```

    `fullName`, `gender`, `phone`, and `password` are required. `dateOfBirth`,
    `address`, `photo`, `email`, `emergencyContact`, `username`, and `initialPackageId`
    are optional. The backend generates `id`, `memberCode`, `userId`, `registrationDate`,
    `createdAt`, `updatedAt`, `qrCode`, and initial `status: "ACTIVE"`.

    Save `member.id` as `memberId` and `user.id` as `memberUserId`.

12. `POST {{baseUrl}}/api/auth/login`

    No auth. Body:

    ```json
    {"usernameOrEmail":"demo_member","password":"member123"}
    ```

    Expected `200` with the same login envelope as the owner, but `user.role` is
    `MEMBER`. Save `token` as `memberToken` and `refreshToken` as `memberRefreshToken`.
    Confirm no `password` or `passwordHash` property exists anywhere in the response.

13. Negative registration: omit `password`, or use `"password":"abc"`. Expected
    `400` with the corresponding required/password message. Reusing the same
    username/email returns `400`:
    `An account with this username or email already exists`.

## 4. Users, roles, and permissions

There is no `/api/roles` or `/api/permissions` route in the current code. The
implemented route is `GET /api/users/roles/all`.

14. `GET {{baseUrl}}/api/users/roles/all`

    Owner auth. Expected `200`:
    `{ success: true, roles: { OWNER, MANAGER, TRAINER, MEMBER } }`, where each role
    contains `label`, `description`, and a `permissions` string array.

15. `GET {{baseUrl}}/api/users`

    Owner auth. Optional query parameters: `role`, `status`, `search`.
    Expected `200`: `{ success: true, count, users: [...] }`. Each user item contains
    `id,email,username,fullName,role,status,phone,avatarUrl,lastLogin,createdAt`.
    Confirm there is no `password` or `passwordHash`.

16. `POST {{baseUrl}}/api/users`

    Owner auth (Manager may create users, but only Owner may create an OWNER):

    ```json
    {
      "email":"manager@example.com",
      "username":"manager1",
      "password":"manager123",
      "fullName":"Demo Manager",
      "role":"MANAGER",
      "phone":"+251911000003",
      "avatarUrl":"https://example.com/manager.png"
    }
    ```

    Required: `email`, `username`, `password`, `fullName`, `role`. Expected `201`:
    `{ success: true, message: "User created successfully", user: <user without passwordHash> }`.
    Save `user.id` as `secondUserId`. Missing required fields or duplicate username/email
    return `400`. A Manager attempting `"role":"OWNER"` returns `403`.

17. `GET {{baseUrl}}/api/users/{{secondUserId}}`

    Owner or Manager auth. Expected `200`: `{ success: true, user: <user with
    memberProfile/trainerProfile, but no passwordHash> }`. An unknown id is `404`.

18. `PATCH {{baseUrl}}/api/users/{{secondUserId}}`

    Owner or Manager auth. All fields are optional:

    ```json
    {"fullName":"Demo Manager Updated","phone":"+251911000004","status":"ACTIVE","role":"MANAGER","password":"manager456"}
    ```

    Expected `200`: `{ success: true, message: "User updated successfully", user: <safe user> }`.
    Unknown id is `404`; assigning OWNER as a non-owner is `403`.

19. `PATCH {{baseUrl}}/api/users/{{secondUserId}}/status`

    Owner or Manager auth. Headers:

    ```text
    Authorization: Bearer {{ownerToken}}
    Content-Type: application/json
    ```

    Body for the suspend test:

    ```json
    {"status":"SUSPENDED"}
    ```

    Expected `200` with `message: "User status changed to SUSPENDED"` and
    `user.status: "SUSPENDED"`.

    Repeat the same request with each body to test the other status actions:

    ```json
    {"status":"ACTIVE"}
    ```

    ```json
    {"status":"DEACTIVATED"}
    ```

    Each expected response is `200`, with `user.status` matching the requested value.
    Invalid/missing status is `400`; unknown id is `404`.

    **No-auth negative test:** remove the Authorization header. Expected `401`:
    `Authentication required. Please log in.`

    **Wrong-role negative test:** use `{{memberToken}}` or `{{trainerToken}}`.
    Expected `403` because only Owner/Manager roles may change user status.

    **Self-action negative test:** send the same request with `{{ownerUserId}}` as the
    URL id and `{"status":"SUSPENDED"}` (or `{"status":"DEACTIVATED"}`) using
    `{{ownerToken}}`. Expected `400`:
    `{ "success": false, "message": "You cannot suspend or delete your own account." }`.
    The Owner remains active and can still manage other users.

20. `POST {{baseUrl}}/api/users/{{secondUserId}}/reset-password`

    Owner or Manager auth. Body:
{{baseUrl}}/api/members
    ```json
    {"newPassword":"manager789"}
    ```

    Expected `200`: `{ success: true, message: "Password reset for manager1" }`.
    Missing or short password is `400`; unknown id is `404`.

21. `DELETE {{baseUrl}}/api/users/{{secondUserId}}`

    Owner auth only. Headers:
    ```text
    Authorization: Bearer {{ownerToken}}
    ```
    This is a **hard delete**. The user row is permanently removed.
    If the user has a member profile, its memberships, payments, attendance,
    trainer assignments, and training sessions are cascade-deleted by the database.
    Audit logs and records where the user is only a recorder retain their rows with
    their nullable user reference cleared.

    Expected `200`: `{ success: true, message: "<username> and all associated data have been permanently deleted" }`.
    Follow with `GET {{baseUrl}}/api/users` using `{{ownerToken}}` and confirm the
    deleted user is no longer listed.

    **No-auth negative test:** remove the Authorization header. Expected `401`.

    **Wrong-role negative test:** use `{{memberToken}}` or `{{trainerToken}}`.
    Expected `403` because delete is Owner-only.

    **Unknown-user negative test:** replace `{{secondUserId}}` with a nonexistent UUID.
    Expected `404`: `User not found`.

    **Self-action negative test:** send `DELETE {{baseUrl}}/api/users/{{ownerUserId}}`
    with `{{ownerToken}}`. Expected `400` with:
    `You cannot suspend or delete your own account.` The Owner account must remain
    active and must not be deleted. Deleting another permitted user still follows
    the normal Owner-only behavior above.

## 5. Members

22. `GET `

    Owner, Manager, or Trainer auth. Optional query parameters: `status`, `search`,
    `membershipStatus`. Expected `200`: `{ success: true, count, members: [...] }`.

23. `GET {{baseUrl}}/api/members/{{memberId}}`

    Any authenticated role. A MEMBER may access only its own member id; another id
    returns `403`. Expected `200`: `{ success: true, member: <member with user,
    memberships, attendances, payments, trainers, sessions> }`. Unknown id is `404`.
 `POST {{baseUrl}}/api/members`
24.

    Owner or Manager auth. Body:

    ```json
    {
      "fullName":"Staff-Created Member",
      "gender":"MALE",
      "dateOfBirth":"1990-01-01",
      "phone":"+251911000005",
      "email":"staff.member@example.com",
      "address":"Chagni",
      "photo":"https://example.com/member.png",
      "emergencyContact":"+251911000006"
    }
    ```

    Required: `fullName`, `phone`, `gender`. `initialPackageId` is optional and, if
    valid, immediately creates an active membership and initial CASH payment.
    Expected `201`: `{ success: true, message: "Member registered successfully", member: <member> }`.
    Save `member.id` as `memberId` if this is the member used for the remaining flow.
    Missing required fields is `400`.

25. `PATCH {{baseUrl}}/api/members/{{memberId}}`

    Owner or Manager auth. Any of `fullName,gender,dateOfBirth,phone,email,address,
    photo,emergencyContact,status` may be supplied. Example:

    ```json
    {"phone":"+251911000007","address":"Updated address"}
    ```

    Expected `200`: `{ success: true, message: "Member updated successfully", member: <member> }`.
    Unknown id is `404`.

26. `GET {{baseUrl}}/api/members/{{memberId}}/qr`

    Any authenticated role; a MEMBER may request only its own QR. Expected `200`:

    ```json
    {
      "success":true,
      "member":{"id":"<id>","memberCode":"CHG-...","fullName":"...","status":"ACTIVE","activeMembership":{}},
      "qrCodeData":"<JSON string>",
      "qrImage":"data:image/png;base64,..."
    }
    ```

    Unknown id is `404`; a member requesting another member's QR is `403`.

## 6. Packages and memberships

27. `GET {{baseUrl}}/api/packages?status=ACTIVE`

    No auth. Expected `200`: `{ success: true, count, packages: [...] }`.

28. `GET {{baseUrl}}/api/packages/{{packageId}}`

    No auth. Expected `200`: `{ success: true, package: <package with up to ten
    recent memberships and each member> }`. Unknown id is `404`.

29. `POST {{baseUrl}}/api/packages`

    Owner or Manager auth. Body:

    ```json
    {
      "name":"Test Monthly",
      "description":"Thirty day test package",
      "durationDays":30,
      "price":50,
      "features":["Gym access","Locker"],
      "status":"ACTIVE"
    }
    ```

    Required: `name`, `durationDays`, `price`. `description`, `features`, and `status`
    are optional. Expected `201`: `{ success: true, message: "Package created successfully", package: <package> }`.
    Duplicate name returns `400`, not `409`; missing required values returns `400`.
    Save `package.id` as `packageId` if using this package.

30. `PATCH {{baseUrl}}/api/packages/{{packageId}}`

    Owner or Manager auth. All fields are optional and use the same names as create.
    Expected `200`: `{ success: true, message: "Package updated successfully", package: <package> }`.
    Unknown id is `404`.

31. `POST {{baseUrl}}/api/memberships`

    Owner or Manager auth. Body:

    ```json
    {
      "memberId":"{{memberId}}",
      "packageId":"{{packageId}}",
      "startDate":"2026-09-07T00:00:00.000Z",
      "pricePaid":420,
      "paymentMethod":"CASH",
      "notes":"Postman membership test",
      "autoRenew":false
    }
    ```

    Required: `memberId`, `packageId`. Optional: `startDate`, `pricePaid`, `paymentMethod`,
    `notes`, `autoRenew`. Valid payment methods are `CASH`, `CARD`, `BANK_TRANSFER`,
    `MOBILE_MONEY`.

    Expected `201`:
    `{ success: true, message: "Membership registered successfully", membership: <membership with package/member>, payment: <payment> }`.
    Save `membership.id` as `membershipId`. The endpoint creates the membership and a
    COMPLETED payment in one Prisma transaction. Missing ids are `400`; unknown member
    or package is `404`.

32. `GET {{baseUrl}}/api/memberships?memberId={{memberId}}`

    Any authenticated role. A MEMBER is automatically restricted to its own history.
    Expected `200`: `{ success: true, count, memberships: [...] }`.

33. `GET {{baseUrl}}/api/memberships/{{membershipId}}`

    Any authenticated role, but a MEMBER may only access its own membership. Expected
    `200`: `{ success: true, membership: <membership with member, package, payments> }`.
    Unknown id is `404`; cross-member access by a MEMBER is `403`.

34. `POST {{baseUrl}}/api/memberships/{{membershipId}}/renew`

    Owner or Manager auth. Body fields are optional:

    ```json
    {"packageId":"{{packageId}}","pricePaid":420,"paymentMethod":"CARD","notes":"Renewal test"}
    ```

    Expected `200`:
    `{ success: true, message: "Membership renewed successfully", membership: <updated membership>, payment: <new payment> }`.
    The membership becomes `ACTIVE`, its dates are extended, and a COMPLETED payment
    referencing the same membership is created in the same transaction. Unknown
    membership/package is `404`.

35. `PATCH {{baseUrl}}/api/memberships/{{membershipId}}/status`

    Owner or Manager auth. Body:

    ```json
    {"status":"SUSPENDED","notes":"Testing QR rejection"}
    ```

    `status` is required; code accepts the supplied string. Expected `200`:
    `{ success: true, message: "Membership status updated to SUSPENDED", membership: <membership> }`.
    Missing status is `400`; unknown id is `404`. Restore with `{"status":"ACTIVE"}`.

## 7. Payments

36. `GET {{baseUrl}}/api/payments?memberId={{memberId}}`

    Any authenticated role. MEMBER requests are always restricted to the member's own
    records. Optional query parameters: `status`, `paymentMethod`, `memberId`,
    `startDate`, `endDate`, `search`. Expected `200`:
    `{ success: true, count, totalAmount, payments: [...] }`.

37. `GET {{baseUrl}}/api/payments/{{paymentId}}`

    Any authenticated role. Expected `200`:
    `{ success: true, payment: <payment with member/membership/recordedBy>, receipt: { receiptNumber,date,gymName,gymAddress,gymPhone,member:{name,code,phone},items:[{description,amount}],total,paymentMethod,status,cashier,notes } }`.
    Unknown id is `404`.

38. `POST {{baseUrl}}/api/payments`

    Owner or Manager auth. Body:

    ```json
    {
      "memberId":"{{memberId}}",
      "membershipId":"{{membershipId}}",
      "amount":25,
      "paymentMethod":"MOBILE_MONEY",
      "notes":"Standalone payment test",
      "paymentDate":"2026-09-07T10:00:00.000Z"
    }
    ```

    Required: `memberId` and a positive `amount`. Other fields are optional.
    Expected `201`: `{ success: true, message: "Payment recorded successfully", payment: <payment> }`.
    Unknown member is `404`; missing/non-positive amount is `400`.

    **Transaction-dependent membership check:** this endpoint records a payment and
    notifies the member, but it does **not** update membership dates or status. To
    prove payment-driven activation/renewal, use the membership create/renew endpoint
    in step 31 or 34 and verify both returned objects: `payment.membershipId` equals
    `membership.id`, `payment.status` is `COMPLETED`, and the membership is `ACTIVE`
    with a new/future `endDate`. A standalone payment must not be reported as
    activating a membership.

39. `POST {{baseUrl}}/api/payments/{{paymentId}}/refund`

    Owner or Manager auth. Body may be empty or:

    ```json
    {"refundReason":"Postman refund test"}
    ```

    Expected `200`: `{ success: true, message: "Refund processed successfully", payment: <payment with status REFUNDED> }`.
    Unknown id is `404`; refunding an already REFUNDED payment is `400`.

## 8. QR and attendance

40. `POST {{baseUrl}}/api/attendance/check-in`

    Any authenticated role. Use either `memberCode` or `qrData`:

    ```json
    {"memberCode":"CHG-1001"}
    ```

    Or use the exact `qrCodeData` returned by step 26:

    ```json
    {"qrData":"{\"code\":\"CHG-1001\",\"gym\":\"CHAGNI_GYM\",\"created\":\"...\"}"}
    ```

    With an active member and active, currently valid membership, expected `200`:
    `{ success:true, granted:true, message, member:{id,fullName,memberCode,photo,packageName,daysRemaining}, attendance:<attendance> }`.
    Save `attendance.id` as `attendanceId`. Missing both values is `400`; unknown QR/member
    is `404`; inactive member or expired/suspended/cancelled/no membership is `403` with
    `granted:false`, `rejectionReason`, `member`, and `attendance`. Repeating the same
    successful scan within 15 seconds returns `429`.

    **Required expired/inactive test:** first set the membership to `SUSPENDED` using
    step 35, scan again, and confirm `403`, `granted:false`, and an attendance record
    with `status:"REJECTED"`. Restore `ACTIVE`, then use the QR scan again.

41. `GET {{baseUrl}}/api/attendance?memberId={{memberId}}`

    Any authenticated role; MEMBER requests are restricted to own records. Optional
    query parameters: `date`, `memberId`, `status`, `search`, `limit`. Expected `200`:
    `{ success:true, count, attendances:[...] }`.

42. `POST {{baseUrl}}/api/attendance/manual-check-in`

    Owner or Manager auth. Body:

    ```json
    {"memberId":"{{memberId}}","status":"GRANTED"}
    ```

    `memberId` is required; `status` and `rejectionReason` are optional. Expected
    `201`: `{ success:true, message:"Attendance recorded", attendance:<attendance> }`.
    Unknown member is `404`; missing memberId is `400`.

43. `PATCH {{baseUrl}}/api/attendance/{{attendanceId}}/correct`

    Any authenticated role. Owners/Managers may correct any record; a MEMBER may only
    correct its own. Body fields are optional:

    ```json
    {"status":"GRANTED","rejectionReason":null,"entryTime":"2026-09-07T10:00:00.000Z","exitTime":"2026-09-07T11:00:00.000Z"}
    ```

    Expected `200`: `{ success:true, message:"Attendance corrected successfully", attendance:<attendance> }`.
    Unknown id is `404`; a MEMBER correcting another member's record is `403`.

## 9. Trainers and training sessions

45. `GET {{baseUrl}}/api/trainers`

    Any authenticated role. Optional `status` and `search`. Expected:
    `{ success:true, count, trainers:[...] }`.

46. `GET {{baseUrl}}/api/trainers/{{trainerId}}`

    Any authenticated role. Expected `{ success:true, trainer:<trainer with user,
    assignedMembers, active memberships, and sessions> }`; unknown id is `404`.

47. `POST {{baseUrl}}/api/trainers`

    Owner or Manager auth. Body:

    ```json
    {
      "fullName":"Postman Trainer",
      "phone":"+251911000008",
      "email":"postman.trainer@example.com",
      "specialization":"Strength Training",
      "bio":"Testing trainer flow",
      "photo":"https://example.com/trainer.png",
      "password":"Trainer@123"
    }
    ```

    Required: `fullName`, `phone`, `email`, `specialization`, and `password`. Passwords must
    be at least 6 characters and include letters and numbers. Expected `201`:
    `{ success:true, message:"Trainer registered successfully", trainer:<trainer> }`.
    The response contains no password or password hash; save `trainer.id` as `trainerId`.
    The trainer can log in through step 3 using the email and password. Missing fields or
    an invalid password are `400`.

48. Negative duplicate-email test: repeat `POST {{baseUrl}}/api/trainers` with the
    same email as an existing trainer. Expected `409`:
    `{ success:false, message:"A trainer with this email already exists" }`.

49. `PATCH {{baseUrl}}/api/trainers/{{trainerId}}`

    Owner or Manager auth. Optional fields: `fullName,phone,email,specialization,bio,
    photo,status`. Expected `200`: `{ success:true, message:"Trainer updated successfully", trainer:<trainer> }`.
    Unknown id is `404`.

50. `POST {{baseUrl}}/api/trainers/assign-member`

    Owner or Manager auth. Body:

    ```json
    {"trainerId":"{{trainerId}}","memberId":"{{memberId}}"}
    ```

    Expected `200`: `{ success:true, message:"Member assigned to trainer successfully", assignment:<assignment with trainer/member> }`.
    Save `assignment.id` as `assignmentId`. Missing ids are `400`; either unknown id is
    `404`. Repeating the request upserts the existing assignment and returns `200`
    rather than `409`.

51. `GET {{baseUrl}}/api/training-sessions?trainerId={{trainerId}}&memberId={{memberId}}`

    Any authenticated role. Optional query parameters: `trainerId`, `memberId`, `status`,
    `date`. MEMBER and TRAINER requests are automatically restricted to their own
    records. Expected `200`: `{ success:true, count, sessions:[...] }`.

52. `POST {{baseUrl}}/api/training-sessions`

    Owner, Manager, or Trainer auth. Body:

    ```json
    {
      "trainerId":"{{trainerId}}",
      "memberId":"{{memberId}}",
      "title":"Postman strength assessment",
      "scheduledDate":"2026-09-08",
      "startTime":"10:00",
      "endTime":"11:00",
      "notes":"First test session"
    }
    ```

    Required: `trainerId`, `memberId`, `title`, `scheduledDate`, `startTime`, `endTime`.
    Expected `201`: `{ success:true, message:"Session scheduled successfully", session:<session with trainer/member> }`.
    Save `session.id` as `sessionId`; missing fields are `400`.

53. `PATCH {{baseUrl}}/api/training-sessions/{{sessionId}}/status`

    Owner, Manager, or Trainer auth. Body:

    ```json
    {"status":"COMPLETED","notes":"Completed in Postman"}
    ```

    Expected `200`: `{ success:true, message:"Session status updated to COMPLETED", session:<session> }`.
    Unknown id is `404`.

## 10. Expenses and trainer payroll

54. `GET {{baseUrl}}/api/expenses`

    Owner or Manager auth. Optional `category`, `startDate`, `endDate`, `search`.
    Expected `200`: `{ success:true, count, totalAmount, categoryTotals, expenses:[...] }`.

55. `POST {{baseUrl}}/api/expenses`

    Owner or Manager auth. Body:

    ```json
    {
      "title":"Postman equipment expense",
      "category":"EQUIPMENT",
      "amount":75,
      "expenseDate":"2026-09-07T12:00:00.000Z",
      "paymentMethod":"CASH",
      "vendor":"Test Vendor",
      "notes":"Expense flow test",
      "receiptAttachment":"receipt-001"
    }
    ```

    Required: `title` and positive `amount`. Expected `201`:
    `{ success:true, message:"Expense created successfully", expense:<expense> }`.
    Save `expense.id` as `expenseId`; invalid/missing title or non-positive amount is
    `400`.

56. `GET {{baseUrl}}/api/expenses/{{expenseId}}`

    Owner or Manager auth. Expected `{ success:true, expense:<expense with recordedBy> }`;
    unknown id is `404`.

57. `PATCH {{baseUrl}}/api/expenses/{{expenseId}}`

    Owner or Manager auth. Any create field is optional. Expected:
    `{ success:true, message:"Expense updated successfully", expense:<expense> }`.
    Unknown id is `404`.

58. `DELETE {{baseUrl}}/api/expenses/{{expenseId}}`

    Owner auth only. Expected `200`: `{ success:true, message:"Expense deleted successfully" }`.
    Manager is `403`; unknown id is `404`.

**Not implemented from the SRS:** there is no trainer payroll model, payroll route,
salary calculation, or payroll controller. Skip trainer-payroll testing; do not invent
a payroll request.

## 11. Notifications

59. `GET {{baseUrl}}/api/notifications`

    Any authenticated role. Expected `200`:
    `{ success:true, unreadCount:<number>, notifications:[...] }`.

60. `POST {{baseUrl}}/api/notifications/send`

    Owner or Manager auth. Body:

    ```json
    {
      "recipientId":"{{memberUserId}}",
      "title":"Postman notification",
      "message":"Notification flow test",
      "type":"ANNOUNCEMENT"
    }
    ```

    `title` and `message` are required; `recipientId` and `type` are optional.
    `recipientId` must be a **User ID** (use `{{memberUserId}}`, not `{{memberId}}`);
    omit it to send a global notification. Valid types are `MEMBERSHIP`, `PAYMENT`,
    `ATTENDANCE`, `SYSTEM`, `ANNOUNCEMENT`. Expected `201`:
    `{ success:true, message:"Notification sent successfully", notification:<notification> }`.
    An unknown recipient is `404`; an invalid type is `400`.
    Save `notification.id` as `notificationId`. Missing title/message is `400`.

61. `PATCH {{baseUrl}}/api/notifications/{{notificationId}}/read`

    Any authenticated role. Expected `200`: `{ success:true, notification:<updated notification with isRead:true> }`.
    Unknown id is `404`; another user's private notification is `403`.

62. `PATCH {{baseUrl}}/api/notifications/read-all`

    Any authenticated role, no body. Expected `200`:
    `{ success:true, message:"All notifications marked as read" }`.

## 12. Reports, dashboard, and audit logs

63. `GET {{baseUrl}}/api/dashboard`

    Any authenticated role. Expected `200`:
    `{ success:true, data:<role-specific dashboard>, source:"db"|"cache" }`.
    Owner/Manager data contains `role`, `kpis`, `recentAttendance`, `recentPayments`,
    `monthTrends`, `packageStats`. Trainer data contains `role`, `trainer`, `kpis`,
    `todaySessions`, `upcomingSessions`, `assignedMembers`. Member data contains
    `role`, `member`, `activeMembership`, `kpis`, `attendances`, `payments`, `sessions`.

64. `GET {{baseUrl}}/api/reports/members`

    Owner or Manager auth. Expected `{ success:true, summary:{totalMembers,activeMembers,
    suspendedMembers}, genderStats, registrationTrends }`.

65. `GET {{baseUrl}}/api/reports/memberships`

    Owner or Manager auth. Expected `{ success:true, summary:{totalMemberships,active,
    expired,cancelled}, packagePerformance }`.

66. `GET {{baseUrl}}/api/reports/attendance`

    Owner or Manager auth. Expected `{ success:true, summary:{totalVisits,granted,
    rejected,successRate,peakHour,weekdayVisits,weekendVisits}, dailyTrends,
    hourlyDistribution }`.

67. `GET {{baseUrl}}/api/reports/financial?startDate=2026-01-01&endDate=2026-12-31`

    Owner or Manager auth. Both query parameters are optional. Expected:
    `{ success:true, summary:{totalRevenue,totalExpenses,netProfit,profitMargin,
    transactionsCount,expensesCount}, monthlySummary, expensesByCategory, paymentsByMethod }`.

68. `GET {{baseUrl}}/api/reports/trainers`

    Owner or Manager auth. Expected `{ success:true, summary:{totalTrainers,
    activeTrainers,totalAssignments,totalSessions,sessionsThisMonth}, workload }`.

69. `GET {{baseUrl}}/api/audit-logs`

    
