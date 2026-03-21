# Auth Service

## Responsibility

Auth Service owns user identity and account lifecycle: registration, login, refresh tokens, profile management, and admin moderation actions (ban/unban/delete). It is the system source of truth for users and roles.

## Port

- `8081` internal (routed via Gateway)

## Key Dependencies

- MySQL (`auth_db`)
- Spring Security + JWT
- BCrypt password encoder

## Configuration

Key settings:

- `app.jwt.secret`
- `app.jwt.expiration=900000` (15 min)
- `app.jwt.refresh-expiration=604800000` (7 days)
- datasource: `jdbc:mysql://localhost:3307/auth_db...`
- eureka registration enabled

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register user and return token pair |
| POST | `/api/auth/login` | No | Login and return token pair |
| POST | `/api/auth/refresh-token` | No | Rotate access token using refresh token |
| GET | `/api/users/profile` | Yes | Current user profile by `X-User-Id` |
| PUT | `/api/users/profile` | Yes | Update own profile |
| GET | `/api/users/{id}` | Yes | Get profile by id |
| GET | `/api/admin/users` | Admin | Paginated user list |
| PUT | `/api/admin/users/{id}/ban` | Admin | Ban user |
| PUT | `/api/admin/users/{id}/unban` | Admin | Unban user |
| DELETE | `/api/admin/users/{id}` | Admin | Delete user |

## Key Classes

- `AuthController`: auth endpoints.
- `UserController`: profile and admin endpoints.
- `AuthService`: registration/login/refresh business logic.
- `UserService`: profile/admin operations.
- `User`: JPA entity for `users` table.
- `JwtUtil`: token generation and validation helper.
- `JwtAuthFilter`: service-side Spring Security filter.

## Database Model

Table `users` includes: id, name, email, password, mobile, city, pincode, latitude, longitude, role, isBanned, averageRating, totalRatings, createdAt, updatedAt.

## Security Notes

- Passwords are hashed with BCrypt.
- Access token carries claims: `sub(userId)`, `email`, `name`, `role`.
- Refresh endpoint validates refresh token expiration and issues new access token.
- Admin endpoints guarded with `@PreAuthorize("hasRole('ADMIN')")`.
