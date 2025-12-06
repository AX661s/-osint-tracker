"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from auth.models import (
    LoginRequest, LoginResponse, VerifySessionRequest, VerifySessionResponse,
    LogoutRequest, UserInfoResponse, CreateUserRequest
)
from auth_operations import (
    login_user, verify_session, logout_user, create_user, get_user_info
)
from models import get_db

router = APIRouter(prefix="/auth")
