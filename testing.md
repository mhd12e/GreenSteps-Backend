# API Route Testing Guide

This guide provides instructions on how to set up your environment, run the FastAPI application, and test its authentication routes.

## 1. Environment Setup

Before running the application, ensure you have the necessary environment variables and dependencies.

### 1.1. Environment Variables

Create a `.env` file in the project root with the following variables. Replace placeholder values with your actual database credentials and a strong JWT secret.

```dotenv
DATABASE_URL="postgresql://user:password@host:port/database_name"
JWT_SECRET="your_super_secret_jwt_key_here"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 1.2. Install Dependencies

Ensure you have a Python virtual environment set up and activate it. Then install the required packages:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 1.3. Database Setup

Ensure you have a PostgreSQL database running and accessible via the `DATABASE_URL` provided in your `.env` file. The application will automatically create the necessary tables on startup.

## 2. Running the Application

Once the environment is set up, you can run the FastAPI application using Uvicorn:

```bash
uvicorn main:app --reload
```

The API will typically be available at `http://127.0.0.1:8000`.

## 3. Testing Routes

You can use `curl` or a similar HTTP client to test the API endpoints.

---

### 3.1. Register User (`POST /auth/register`)

Registers a new user with an email and password.

-   **Endpoint**: `/auth/register`
-   **Method**: `POST`
-   **Request Body**: `RegisterRequest` (email, password)
-   **Success Response**: `StatusResponse` (status: "ok")
-   **Error Response**: `ErrorResponse` (error_text)

**Example Request:**

```bash
curl -X POST http://127.0.0.1:8000/auth/register \
-H "Content-Type: application/json" \
-d '{"email": "test@example.com", "password": "securepassword"}'
```

**Expected Success Response (Status: 200 OK):**

```json
{
  "status": "ok"
}
```

---

### 3.2. Login User (`POST /auth/login`)

Authenticates a user and provides access and refresh tokens.

-   **Endpoint**: `/auth/login`
-   **Method**: `POST`
-   **Request Body**: `LoginRequest` (email, password)
-   **Success Response**: `TokenResponse` (access_token, refresh_token, token_type)
-   **Error Response**: `ErrorResponse` (error_text) - e.g., "Incorrect email or password" (Status: 401 Unauthorized)

**Example Request:**

```bash
curl -X POST http://127.0.0.1:8000/auth/login \
-H "Content-Type: application/json" \
-d '{"email": "test@example.com", "password": "securepassword"}'
```

**Expected Success Response (Status: 200 OK):**

```json
{
  "access_token": "your_access_token_here",
  "refresh_token": "your_refresh_token_here",
  "token_type": "bearer"
}
```

**Expected Error Response (Status: 401 Unauthorized):**

```json
{
  "error_text": "Incorrect email or password"
}
```

---

### 3.3. Refresh Access Token (`POST /auth/refresh`)

Uses a refresh token to obtain a new access token.

-   **Endpoint**: `/auth/refresh`
-   **Method**: `POST`
-   **Request Body**: `RefreshTokenRequest` (refresh_token)
-   **Success Response**: `AccessTokenResponse` (access_token, token_type)
-   **Error Response**: `ErrorResponse` (error_text) - e.g., "Not authenticated" or "Invalid refresh token" (Status: 401 Unauthorized)

**Example Request:**

```bash
# Replace <YOUR_REFRESH_TOKEN> with an actual refresh token obtained from login
curl -X POST http://127.0.0.1:8000/auth/refresh \
-H "Content-Type: application/json" \
-d '{"refresh_token": "<YOUR_REFRESH_TOKEN>"}'
```

**Expected Success Response (Status: 200 OK):**

```json
{
  "access_token": "your_new_access_token_here",
  "token_type": "bearer"
}
```

**Expected Error Response (Status: 401 Unauthorized):**

```json
{
  "error_text": "Not authenticated"
}
```

---

### 3.4. Protected Route (`GET /auth/protected`)

Accesses a protected resource using an access token.

-   **Endpoint**: `/auth/protected`
-   **Method**: `GET`
-   **Request Headers**: `Authorization: Bearer <ACCESS_TOKEN>`
-   **Success Response**: JSON with user ID
-   **Error Response**: `ErrorResponse` (error_text) - e.g., "Not authenticated" (Status: 401 Unauthorized)

**Example Request:**

```bash
# Replace <YOUR_ACCESS_TOKEN> with an actual access token
curl -X GET http://127.0.0.1:8000/auth/protected \
-H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

**Expected Success Response (Status: 200 OK):**

```json
{
  "user_id": "uuid_of_the_authenticated_user"
}
```

**Expected Error Response (Status: 401 Unauthorized):**

```json
{
  "error_text": "Not authenticated"
}
```

---