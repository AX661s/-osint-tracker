"""
Authentication models and schemas
"""
from pydantic import BaseModel, Field
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    points: Optional[int] = None
    session_token: Optional[str] = None
    expires_at: Optional[str] = None
    message: str

class VerifySessionRequest(BaseModel):
    session_token: str

class VerifySessionResponse(BaseModel):
    valid: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    points: Optional[int] = None
    message: str

class LogoutRequest(BaseModel):
    session_token: str

class UserInfoResponse(BaseModel):
    success: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    email: Optional[str] = None
    points: Optional[int] = None
    created_at: Optional[str] = None
    message: Optional[str] = None

class CreateUserRequest(BaseModel):
    username: str
    password: str
    is_admin: Optional[bool] = False
    email: Optional[str] = None
    points: Optional[int] = 0

class UpdateUserRequest(BaseModel):
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    points: Optional[int] = None
