"""Scheduling API: advisor availability, user booking, calendar views."""

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.advisor import Advisor, AvailabilitySlot, Booking
from app.api.deps import get_current_user, get_admin_user

router = APIRouter(prefix="/scheduling", tags=["scheduling"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ── Schemas ──────────────────────────────────────────────────────────────

class AdvisorOut(BaseModel):
    id: str
    user_id: str
    name: str | None
    bio: str | None
    credentials: str | None
    specialties: list | None
    languages: list | None
    timezone: str | None
    session_duration_minutes: int
    active: bool


class AvailabilitySlotIn(BaseModel):
    day_of_week: int  # 0=Mon, 6=Sun
    start_time: str   # "09:00"
    end_time: str      # "17:00"


class AvailabilitySlotOut(BaseModel):
    id: str
    day_of_week: int
    day_name: str
    start_time: str
    end_time: str


class SetAvailabilityIn(BaseModel):
    slots: list[AvailabilitySlotIn]


class TimeSlotOut(BaseModel):
    date: str
    start_time: str
    end_time: str


class BookingIn(BaseModel):
    advisor_id: str
    date: str        # "2026-03-15"
    start_time: str  # "10:00"


class BookingOut(BaseModel):
    id: str
    user_id: str
    user_name: str | None
    user_email: str | None
    advisor_id: str
    advisor_name: str | None
    date: str
    start_time: str
    end_time: str
    status: str
    notes: str | None
    created_at: datetime | None


class AdvisorProfileIn(BaseModel):
    bio: str | None = None
    credentials: str | None = None
    specialties: list | None = None
    languages: list | None = None
    timezone: str | None = None
    session_duration_minutes: int | None = None


# ── Helpers ──────────────────────────────────────────────────────────────

async def _get_or_create_advisor(user: User, db: AsyncSession) -> Advisor:
    """Get advisor profile for a user, or create one if they have the advisor/admin role."""
    result = await db.execute(select(Advisor).where(Advisor.user_id == user.id))
    advisor = result.scalar_one_or_none()
    if advisor:
        return advisor

    if user.role not in ("advisor", "admin"):
        raise HTTPException(status_code=403, detail="Not an advisor")

    advisor = Advisor(user_id=user.id, timezone="Asia/Dubai")
    db.add(advisor)
    await db.commit()
    await db.refresh(advisor)
    return advisor


async def _get_advisor_with_user(advisor_id: str, db: AsyncSession) -> tuple[Advisor, User]:
    result = await db.execute(select(Advisor).where(Advisor.id == UUID(advisor_id)))
    advisor = result.scalar_one_or_none()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    result = await db.execute(select(User).where(User.id == advisor.user_id))
    user = result.scalar_one_or_none()
    return advisor, user


# ── Advisor profile & availability ───────────────────────────────────────

@router.get("/my-profile", response_model=AdvisorOut)
async def get_my_advisor_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    advisor = await _get_or_create_advisor(user, db)
    return AdvisorOut(
        id=str(advisor.id),
        user_id=str(advisor.user_id),
        name=user.full_name,
        bio=advisor.bio,
        credentials=advisor.credentials,
        specialties=advisor.specialties,
        languages=advisor.languages,
        timezone=advisor.timezone,
        session_duration_minutes=advisor.session_duration_minutes,
        active=advisor.active,
    )


@router.patch("/my-profile", response_model=AdvisorOut)
async def update_my_advisor_profile(
    data: AdvisorProfileIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    advisor = await _get_or_create_advisor(user, db)
    if data.bio is not None:
        advisor.bio = data.bio
    if data.credentials is not None:
        advisor.credentials = data.credentials
    if data.specialties is not None:
        advisor.specialties = data.specialties
    if data.languages is not None:
        advisor.languages = data.languages
    if data.timezone is not None:
        advisor.timezone = data.timezone
    if data.session_duration_minutes is not None:
        advisor.session_duration_minutes = data.session_duration_minutes
    await db.commit()
    await db.refresh(advisor)
    return AdvisorOut(
        id=str(advisor.id),
        user_id=str(advisor.user_id),
        name=user.full_name,
        bio=advisor.bio,
        credentials=advisor.credentials,
        specialties=advisor.specialties,
        languages=advisor.languages,
        timezone=advisor.timezone,
        session_duration_minutes=advisor.session_duration_minutes,
        active=advisor.active,
    )


@router.get("/my-availability", response_model=list[AvailabilitySlotOut])
async def get_my_availability(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    advisor = await _get_or_create_advisor(user, db)
    result = await db.execute(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.advisor_id == advisor.id)
        .order_by(AvailabilitySlot.day_of_week, AvailabilitySlot.start_time)
    )
    slots = result.scalars().all()
    return [
        AvailabilitySlotOut(
            id=str(s.id),
            day_of_week=s.day_of_week,
            day_name=DAY_NAMES[s.day_of_week],
            start_time=s.start_time,
            end_time=s.end_time,
        )
        for s in slots
    ]


@router.put("/my-availability")
async def set_my_availability(
    data: SetAvailabilityIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace all availability slots with the provided set."""
    advisor = await _get_or_create_advisor(user, db)

    # Validate
    for slot in data.slots:
        if slot.day_of_week < 0 or slot.day_of_week > 6:
            raise HTTPException(status_code=400, detail=f"Invalid day_of_week: {slot.day_of_week}")
        if slot.start_time >= slot.end_time:
            raise HTTPException(status_code=400, detail=f"start_time must be before end_time")

    # Delete existing slots
    old = await db.execute(select(AvailabilitySlot).where(AvailabilitySlot.advisor_id == advisor.id))
    for s in old.scalars().all():
        await db.delete(s)

    # Insert new
    for slot in data.slots:
        db.add(AvailabilitySlot(
            advisor_id=advisor.id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time,
            end_time=slot.end_time,
        ))

    await db.commit()
    return {"detail": f"Set {len(data.slots)} availability slots"}


# ── My bookings (advisor view) ──────────────────────────────────────────

@router.get("/my-bookings", response_model=list[BookingOut])
async def get_my_bookings_as_advisor(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get bookings for the current advisor."""
    advisor = await _get_or_create_advisor(user, db)
    result = await db.execute(
        select(Booking)
        .where(Booking.advisor_id == advisor.id, Booking.status != "cancelled")
        .order_by(Booking.date, Booking.start_time)
    )
    bookings = result.scalars().all()

    out = []
    for b in bookings:
        u_result = await db.execute(select(User).where(User.id == b.user_id))
        u = u_result.scalar_one_or_none()
        out.append(BookingOut(
            id=str(b.id),
            user_id=str(b.user_id),
            user_name=u.full_name if u else None,
            user_email=u.email if u else None,
            advisor_id=str(b.advisor_id),
            advisor_name=user.full_name,
            date=b.date,
            start_time=b.start_time,
            end_time=b.end_time,
            status=b.status,
            notes=b.notes,
            created_at=b.created_at,
        ))
    return out


# ── User-facing: list advisors, view slots, book ────────────────────────

@router.get("/advisors", response_model=list[AdvisorOut])
async def list_advisors(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active advisors."""
    result = await db.execute(select(Advisor).where(Advisor.active == True))
    advisors = result.scalars().all()
    out = []
    for a in advisors:
        u_result = await db.execute(select(User).where(User.id == a.user_id))
        u = u_result.scalar_one_or_none()
        out.append(AdvisorOut(
            id=str(a.id),
            user_id=str(a.user_id),
            name=u.full_name if u else None,
            bio=a.bio,
            credentials=a.credentials,
            specialties=a.specialties,
            languages=a.languages,
            timezone=a.timezone,
            session_duration_minutes=a.session_duration_minutes,
            active=a.active,
        ))
    return out


@router.get("/advisors/{advisor_id}/slots", response_model=list[TimeSlotOut])
async def get_available_slots(
    advisor_id: str,
    days_ahead: int = 14,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get available booking slots for an advisor over the next N days."""
    advisor, _ = await _get_advisor_with_user(advisor_id, db)

    # Load availability pattern
    result = await db.execute(
        select(AvailabilitySlot).where(AvailabilitySlot.advisor_id == advisor.id)
    )
    availability = result.scalars().all()
    if not availability:
        return []

    # Load existing bookings in the date range
    today = datetime.utcnow().date()
    end_date = today + timedelta(days=days_ahead)
    result = await db.execute(
        select(Booking).where(
            Booking.advisor_id == advisor.id,
            Booking.status != "cancelled",
            Booking.date >= today.isoformat(),
            Booking.date <= end_date.isoformat(),
        )
    )
    existing_bookings = result.scalars().all()
    booked_set = {(b.date, b.start_time) for b in existing_bookings}

    # Generate available slots
    duration = advisor.session_duration_minutes
    slots = []
    for day_offset in range(days_ahead):
        date = today + timedelta(days=day_offset)
        weekday = date.weekday()  # 0=Mon

        for avail in availability:
            if avail.day_of_week != weekday:
                continue

            # Generate time slots within this availability window
            start_h, start_m = map(int, avail.start_time.split(":"))
            end_h, end_m = map(int, avail.end_time.split(":"))
            current_minutes = start_h * 60 + start_m
            end_minutes = end_h * 60 + end_m

            while current_minutes + duration <= end_minutes:
                slot_start = f"{current_minutes // 60:02d}:{current_minutes % 60:02d}"
                slot_end_min = current_minutes + duration
                slot_end = f"{slot_end_min // 60:02d}:{slot_end_min % 60:02d}"
                date_str = date.isoformat()

                # Skip if already booked
                if (date_str, slot_start) not in booked_set:
                    # Skip past slots for today
                    if date == today:
                        now_minutes = datetime.utcnow().hour * 60 + datetime.utcnow().minute
                        if current_minutes <= now_minutes:
                            current_minutes += duration
                            continue

                    slots.append(TimeSlotOut(
                        date=date_str,
                        start_time=slot_start,
                        end_time=slot_end,
                    ))

                current_minutes += duration

    return slots


@router.post("/book", response_model=BookingOut)
async def book_session(
    data: BookingIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Book a session with an advisor."""
    advisor, advisor_user = await _get_advisor_with_user(data.advisor_id, db)

    # Check if slot is available (not already booked)
    existing = await db.execute(
        select(Booking).where(
            Booking.advisor_id == advisor.id,
            Booking.date == data.date,
            Booking.start_time == data.start_time,
            Booking.status != "cancelled",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This slot is already booked")

    # Check user doesn't already have a booking with this advisor
    user_existing = await db.execute(
        select(Booking).where(
            Booking.user_id == user.id,
            Booking.advisor_id == advisor.id,
            Booking.status == "confirmed",
        )
    )
    if user_existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You already have a booking with this advisor. Cancel it first to rebook.")

    end_min = int(data.start_time.split(":")[0]) * 60 + int(data.start_time.split(":")[1]) + advisor.session_duration_minutes
    end_time = f"{end_min // 60:02d}:{end_min % 60:02d}"

    booking = Booking(
        user_id=user.id,
        advisor_id=advisor.id,
        date=data.date,
        start_time=data.start_time,
        end_time=end_time,
        status="confirmed",
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    return BookingOut(
        id=str(booking.id),
        user_id=str(booking.user_id),
        user_name=user.full_name,
        user_email=user.email,
        advisor_id=str(booking.advisor_id),
        advisor_name=advisor_user.full_name if advisor_user else None,
        date=booking.date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        status=booking.status,
        notes=booking.notes,
        created_at=booking.created_at,
    )


@router.get("/my-user-bookings", response_model=list[BookingOut])
async def get_my_bookings_as_user(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get bookings for the current user (not as advisor)."""
    result = await db.execute(
        select(Booking)
        .where(Booking.user_id == user.id, Booking.status != "cancelled")
        .order_by(Booking.date, Booking.start_time)
    )
    bookings = result.scalars().all()
    out = []
    for b in bookings:
        advisor, advisor_user = await _get_advisor_with_user(str(b.advisor_id), db)
        out.append(BookingOut(
            id=str(b.id),
            user_id=str(b.user_id),
            user_name=user.full_name,
            user_email=user.email,
            advisor_id=str(b.advisor_id),
            advisor_name=advisor_user.full_name if advisor_user else None,
            date=b.date,
            start_time=b.start_time,
            end_time=b.end_time,
            status=b.status,
            notes=b.notes,
            created_at=b.created_at,
        ))
    return out


@router.post("/cancel/{booking_id}")
async def cancel_booking(
    booking_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a booking. Both user and advisor can cancel."""
    result = await db.execute(select(Booking).where(Booking.id == UUID(booking_id)))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check permission: user who booked, or the advisor
    advisor_result = await db.execute(select(Advisor).where(Advisor.id == booking.advisor_id))
    advisor = advisor_result.scalar_one_or_none()
    is_booker = str(booking.user_id) == str(user.id)
    is_advisor = advisor and str(advisor.user_id) == str(user.id)
    is_admin = user.role in ("admin", "auditor")

    if not (is_booker or is_advisor or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    booking.status = "cancelled"
    await db.commit()
    return {"detail": "Booking cancelled"}


# ── Admin: all bookings ─────────────────────────────────────────────────

@router.get("/all-bookings", response_model=list[BookingOut])
async def get_all_bookings(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin view: all bookings across all advisors."""
    result = await db.execute(
        select(Booking).order_by(Booking.date.desc(), Booking.start_time)
    )
    bookings = result.scalars().all()
    out = []
    for b in bookings:
        u_result = await db.execute(select(User).where(User.id == b.user_id))
        u = u_result.scalar_one_or_none()
        advisor, advisor_user = await _get_advisor_with_user(str(b.advisor_id), db)
        out.append(BookingOut(
            id=str(b.id),
            user_id=str(b.user_id),
            user_name=u.full_name if u else None,
            user_email=u.email if u else None,
            advisor_id=str(b.advisor_id),
            advisor_name=advisor_user.full_name if advisor_user else None,
            date=b.date,
            start_time=b.start_time,
            end_time=b.end_time,
            status=b.status,
            notes=b.notes,
            created_at=b.created_at,
        ))
    return out
