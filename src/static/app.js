document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const authButton = document.getElementById("auth-button");
  const closeModal = document.getElementById("close-modal");
  const logoutButton = document.getElementById("logout-button");
  const adminInfo = document.getElementById("admin-info");
  const adminUsername = document.getElementById("admin-username");
  const registerButton = document.getElementById("register-button");
  const loginError = document.getElementById("login-error");

  let currentToken = localStorage.getItem("teacherToken");

  // Function to update UI based on authentication state
  async function updateAuthUI() {
    if (currentToken) {
      try {
        const response = await fetch(`/verify-session?token=${encodeURIComponent(currentToken)}`);
        const result = await response.json();
        
        if (result.authenticated) {
          // User is logged in
          authButton.textContent = "👤 Logout";
          adminInfo.classList.remove("hidden");
          adminUsername.textContent = result.username;
          signupForm.style.display = "block";
          enableDeleteButtons();
        } else {
          // Token is invalid
          localStorage.removeItem("teacherToken");
          currentToken = null;
          updateAuthUI();
        }
      } catch (error) {
        console.error("Error verifying session:", error);
        localStorage.removeItem("teacherToken");
        currentToken = null;
        updateAuthUI();
      }
    } else {
      // User is not logged in
      authButton.textContent = "👤 Login";
      adminInfo.classList.add("hidden");
      signupForm.style.display = "none";
      disableDeleteButtons();
    }
  }

  // Enable delete buttons when logged in
  function enableDeleteButtons() {
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.disabled = false;
      button.style.cursor = "pointer";
      button.style.opacity = "1";
    });
  }

  // Disable delete buttons when not logged in
  function disableDeleteButtons() {
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.disabled = true;
      button.style.cursor = "not-allowed";
      button.style.opacity = "0.5";
      button.title = "Login as teacher to manage registrations";
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}" ${!currentToken ? 'disabled' : ''}>❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      // Set initial button state
      if (!currentToken) {
        disableDeleteButtons();
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    
    if (!currentToken) {
      messageDiv.textContent = "Please login as a teacher to unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(currentToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentToken) {
      messageDiv.textContent = "Please login as a teacher first.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(currentToken)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register student. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });

  // Login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    loginError.classList.add("hidden");

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Save token and update UI
        currentToken = result.token;
        localStorage.setItem("teacherToken", currentToken);
        
        // Close modal
        loginModal.classList.add("hidden");
        loginForm.reset();
        
        // Update UI
        updateAuthUI();
        
        // Show success message
        messageDiv.textContent = `Welcome, ${result.username}!`;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      } else {
        loginError.textContent = result.detail || "Login failed. Please try again.";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Error connecting to server. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Auth button click
  authButton.addEventListener("click", () => {
    if (currentToken) {
      // Logout
      fetch(`/logout?token=${encodeURIComponent(currentToken)}`, {
        method: "POST",
      });
      localStorage.removeItem("teacherToken");
      currentToken = null;
      updateAuthUI();
      
      messageDiv.textContent = "Logged out successfully.";
      messageDiv.className = "info";
      messageDiv.classList.remove("hidden");
      
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 3000);
    } else {
      // Show login modal
      loginModal.classList.remove("hidden");
    }
  });

  // Logout button click
  logoutButton.addEventListener("click", () => {
    if (currentToken) {
      fetch(`/logout?token=${encodeURIComponent(currentToken)}`, {
        method: "POST",
      });
      localStorage.removeItem("teacherToken");
      currentToken = null;
      updateAuthUI();
      
      messageDiv.textContent = "Logged out successfully.";
      messageDiv.className = "info";
      messageDiv.classList.remove("hidden");
      
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 3000);
      
      fetchActivities();
    }
  });

  // Close modal button
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  // Close modal when clicking outside
  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Initialize app
  fetchActivities();
  updateAuthUI();
});

