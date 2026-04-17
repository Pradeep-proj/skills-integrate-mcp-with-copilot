"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path
import json
from datetime import datetime, timedelta
import secrets

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load teacher credentials from JSON
def load_teachers():
    teachers_file = os.path.join(current_dir, "teachers.json")
    with open(teachers_file, 'r') as f:
        return json.load(f)["teachers"]

TEACHERS = load_teachers()

# In-memory session storage (maps session token to teacher username and expiration)
sessions = {}

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


# Helper function to verify teacher session
def verify_teacher_session(token: str):
    """Verify that a token is valid and belongs to an authenticated teacher"""
    if token not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = sessions[token]
    if datetime.now() > session["expiration"]:
        del sessions[token]
        raise HTTPException(status_code=401, detail="Session expired")
    
    return session["username"]


@app.post("/login")
def login(username: str, password: str):
    """Teacher login endpoint"""
    if username not in TEACHERS:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if TEACHERS[username] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create a new session token
    token = secrets.token_urlsafe(32)
    sessions[token] = {
        "username": username,
        "expiration": datetime.now() + timedelta(hours=8)
    }
    
    return {"token": token, "username": username}


@app.post("/logout")
def logout(token: str):
    """Teacher logout endpoint"""
    if token in sessions:
        del sessions[token]
    return {"message": "Logged out successfully"}


@app.get("/verify-session")
def verify_session(token: str):
    """Verify if a teacher session is valid"""
    try:
        username = verify_teacher_session(token)
        return {"authenticated": True, "username": username}
    except HTTPException:
        return {"authenticated": False}


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, token: str = None):
    """Sign up a student for an activity - only teachers can register students"""
    # Verify teacher authentication
    if not token:
        raise HTTPException(status_code=401, detail="Teacher authentication required")
    
    verify_teacher_session(token)
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, token: str = None):
    """Unregister a student from an activity - only teachers can unregister students"""
    # Verify teacher authentication
    if not token:
        raise HTTPException(status_code=401, detail="Teacher authentication required")
    
    verify_teacher_session(token)
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
