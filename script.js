import { auth, db } from "./app.js";
import { 
    collection, getDocs, doc, updateDoc, deleteDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";

// Global variables for withdrawal approval context
let currentUserId, currentIndex;

// Admin Login
async function adminLogin() {
    const email = document.getElementById('adminEmail')?.value;
    const password = document.getElementById('adminPassword')?.value;
    const loginMessage = document.getElementById('loginMessage');
    
    if (!email || !password || !loginMessage) {
        console.error("Login elements not found");
        if (loginMessage) loginMessage.innerText = "UI error: Check console";
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists() && adminSnap.data().Role === "admin") {
            const loginSection = document.getElementById('login-section');
            const adminPanel = document.getElementById('admin-panel');
            if (loginSection && adminPanel) {
                loginSection.style.display = 'none';
                adminPanel.style.display = 'block';
                await Promise.all([fetchUsers(), fetchWithdrawals(), fetchTotalEarnings()]);
            } else {
                console.error("Admin panel or login section not found");
                loginMessage.innerText = "UI error: Check console";
            }
        } else {
            loginMessage.innerText = "You are not an admin!";
            await signOut(auth);
        }
    } catch (error) {
        console.error("Admin login error:", error);
        loginMessage.innerText = error.message;
    }
}

// Parse Withdrawal Entry
function parseWithdrawalEntry(entry) {
    if (typeof entry === "string") {
        const regex = /Withdrawn: (\d+) INR \((.*?)\) via (.*)/;
        const match = entry.match(regex);
        if (match) {
            return {
                action: "Recharged",
                amount: match[1],
                status: match[2],
                method: match[3],
                mobileNumber: match[3].split(" via ")[0] || "N/A",
                giftCardNumber: "N/A",
                date: "N/A"
            };
        }
        return { 
            action: "Unknown",
            amount: "0", 
            status: "Unknown", 
            method: "N/A", 
            mobileNumber: "N/A",
            giftCardNumber: "N/A",
            date: "N/A" 
        };
    }
    return {
        action: entry.action || "Unknown",
        amount: entry.amount || "0",
        status: entry.status || "Unknown",
        method: entry.method || "N/A",
        mobileNumber: entry.method && entry.action === "Recharged" ? entry.method.split(" via ")[0] : "N/A",
        giftCardNumber: entry.giftCardNumber || "N/A",
        date: entry.date || "N/A"
    };
}

// Fetch Users
async function fetchUsers() {
    const tableBody = document.querySelector("#users-table tbody");
    if (!tableBody) {
        console.error("Users table body not found");
        return;
    }

    tableBody.innerHTML = '';
    let totalCoins = 0;
    const users = [];

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="7">No users found</td></tr>';
            console.log("No users in database");
            return;
        }

        querySnapshot.forEach(docSnap => {
            const user = docSnap.data();
            users.push({ id: docSnap.id, ...user });
            totalCoins += user.coins || 0;
        });

        users.sort((a, b) => (b.coins || 0) - (a.coins || 0));

        const totalCoinsElement = document.getElementById("total-coins");
        if (totalCoinsElement) {
            totalCoinsElement.innerText = `Total Coins: ${totalCoins}`;
        } else {
            console.warn("Total coins element not found");
        }

        users.forEach(user => {
            const totalWithdrawn = calculateTotalWithdrawn(user.withdrawalHistory);
            const status = user.isDisabled ? "Disabled" : "Active";
            const row = `
                <tr onclick="showUserDetails('${user.id}')">
                    <td>${user.name || "Unknown"}</td>
                    <td>${user.email || "N/A"}</td>
                    <td>${user.mobileNumber || "N/A"}</td>
                    <td>${user.coins || 0}</td>
                    <td>₹${totalWithdrawn.toFixed(2)}</td>
                    <td>${status}</td>
                    <td>
                        <button onclick="event.stopPropagation(); deleteUser('${user.id}')">Delete</button>
                        <button onclick="event.stopPropagation(); toggleUserAccountStatus('${user.id}', ${user.isDisabled || false})">
                            ${user.isDisabled ? "Enable" : "Disable"}
                        </button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
        console.log(`Displayed ${users.length} users`);
    } catch (error) {
        console.error("Error fetching users:", error);
        tableBody.innerHTML = '<tr><td colspan="7">Error loading users</td></tr>';
    }
}

// Fetch Withdrawals
async function fetchWithdrawals() {
    const tableBody = document.querySelector("#withdrawals-table tbody");
    const historyTableBody = document.querySelector("#withdrawals-history-table tbody");
    if (!tableBody || !historyTableBody) {
        console.error("Withdrawal table bodies not found");
        return;
    }

    tableBody.innerHTML = '';
    historyTableBody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="7">No pending withdrawals</td></tr>';
            historyTableBody.innerHTML = '<tr><td colspan="7">No withdrawal history</td></tr>';
            console.log("No users for withdrawals");
            return;
        }

        querySnapshot.forEach(docSnap => {
            const userData = docSnap.data();
            const userId = docSnap.id;

            if (userData.withdrawalHistory && Array.isArray(userData.withdrawalHistory)) {
                userData.withdrawalHistory.forEach((entry, index) => {
                    const { action, amount, status, method, giftCardNumber, date } = parseWithdrawalEntry(entry);
                    if (status === "Pending") {
                        const row = `
                            <tr>
                                <td>${userData.name || "Unknown"}</td>
                                <td>${action}</td>
                                <td>₹${amount}</td>
                                <td>${method}</td>
                                <td>${giftCardNumber}</td>
                                <td>${status}</td>
                                <td>
                                    <button onclick="approveWithdrawal('${userId}', ${index}, '${method}')">Approve</button>
                                    <button onclick="confirmRejection('${userId}', ${index})">Reject</button>
                                </td>
                            </tr>`;
                        tableBody.innerHTML += row;
                    }
                    const historyRow = `
                        <tr>
                            <td>${userData.name || "Unknown"}</td>
                            <td>${action}</td>
                            <td>₹${amount}</td>
                            <td>${method}</td>
                            <td>${giftCardNumber}</td>
                            <td>${status}</td>
                            <td>${date}</td>
                        </tr>`;
                    historyTableBody.innerHTML += historyRow;
                });
            }
        });
        console.log("Withdrawals fetched");
    } catch (error) {
        console.error("Error fetching withdrawals:", error);
        tableBody.innerHTML = '<tr><td colspan="7">Error loading withdrawals</td></tr>';
        historyTableBody.innerHTML = '<tr><td colspan="7">Error loading history</td></tr>';
    }
}

// Calculate Total Withdrawn
function calculateTotalWithdrawn(history) {
    if (!history || !Array.isArray(history)) return 0;
    return history.reduce((total, entry) => {
        const { amount } = parseWithdrawalEntry(entry);
        return total + (parseFloat(amount) || 0);
    }, 0);
}

// Fetch Total Earnings
async function fetchTotalEarnings() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let total = 0;
        querySnapshot.forEach(docSnap => {
            total += calculateTotalWithdrawn(docSnap.data().withdrawalHistory);
        });
        const totalEarningsElement = document.getElementById("total-earnings");
        if (totalEarningsElement) {
            totalEarningsElement.innerText = `₹${total.toFixed(2)}`;
        } else {
            console.warn("Total earnings element not found");
        }
    } catch (error) {
        console.error("Error fetching total earnings:", error);
    }
}

// Search Users
async function searchUsers() {
    const searchValue = document.getElementById("searchUser")?.value.toLowerCase();
    const tableBody = document.querySelector("#users-table tbody");
    const userPanel = document.getElementById("userPanel");
    const panelContent = document.getElementById("userDetails");
    if (!tableBody || !userPanel || !panelContent || !searchValue) {
        console.error("Search elements not found or empty search value");
        return;
    }

    tableBody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const matchedUsers = [];
        querySnapshot.forEach(docSnap => {
            const user = docSnap.data();
            if (user.name?.toLowerCase().includes(searchValue) || user.email?.toLowerCase().includes(searchValue)) {
                matchedUsers.push({ id: docSnap.id, ...user });
            }
        });

        if (matchedUsers.length === 1) {
            const user = matchedUsers[0];
            let withdrawalHistoryHTML = '<h4>Withdrawal History</h4><table><tr><th>Action</th><th>Amount</th><th>Status</th><th>Method</th><th>Gift Card Number</th><th>Date</th></tr>';
            if (user.withdrawalHistory && Array.isArray(user.withdrawalHistory)) {
                user.withdrawalHistory.forEach(entry => {
                    const { action, amount, status, method, giftCardNumber, date } = parseWithdrawalEntry(entry);
                    withdrawalHistoryHTML += `
                        <tr>
                            <td>${action}</td>
                            <td>₹${amount}</td>
                            <td>${status}</td>
                            <td>${method}</td>
                            <td>${giftCardNumber}</td>
                            <td>${date}</td>
                        </tr>`;
                });
            } else {
                withdrawalHistoryHTML += '<tr><td colspan="6">No withdrawal history</td></tr>';
            }
            withdrawalHistoryHTML += '</table>';

            panelContent.innerHTML = `
                <h3>${user.name || "Unknown"}</h3>
                <p>Email: ${user.email || "N/A"}</p>
                <p>Mobile Number: ${user.mobileNumber || "N/A"}</p>
                <p>Coins: ${user.coins || 0}</p>
                <p>Status: ${user.isDisabled ? "Disabled" : "Active"}</p>
                <div>
                    <input type="number" id="coinInput" placeholder="Enter new coin value" min="0">
                    <button onclick="updateUserCoins('${user.id}')">Update Coins</button>
                </div>
                <button onclick="toggleUserAccountStatus('${user.id}', ${user.isDisabled || false})">
                    ${user.isDisabled ? "Enable Account" : "Disable Account"}
                </button>
                ${withdrawalHistoryHTML}
                <button onclick="closeUserPanel()">Close</button>
            `;
            userPanel.classList.add("show");
        } else {
            matchedUsers.sort((a, b) => (b.coins || 0) - (a.coins || 0));
            matchedUsers.forEach(user => {
                const totalWithdrawn = calculateTotalWithdrawn(user.withdrawalHistory);
                const status = user.isDisabled ? "Disabled" : "Active";
                const row = `
                    <tr onclick="showUserDetails('${user.id}')">
                        <td>${user.name || "Unknown"}</td>
                        <td>${user.email || "N/A"}</td>
                        <td>${user.mobileNumber || "N/A"}</td>
                        <td>${user.coins || 0}</td>
                        <td>₹${totalWithdrawn.toFixed(2)}</td>
                        <td>${status}</td>
                        <td>
                            <button onclick="event.stopPropagation(); deleteUser('${user.id}')">Delete</button>
                            <button onclick="event.stopPropagation(); toggleUserAccountStatus('${user.id}', ${user.isDisabled || false})">
                                ${user.isDisabled ? "Enable" : "Disable"}
                            </button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
            if (matchedUsers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">No users found</td></tr>';
            }
        }
        console.log(`Search returned ${matchedUsers.length} users`);
    } catch (error) {
        console.error("Error searching users:", error);
        tableBody.innerHTML = '<tr><td colspan="7">Error loading users</td></tr>';
    }
}

// Toggle User Account Status
async function toggleUserAccountStatus(userId, isCurrentlyDisabled) {
    if (!confirm(`Are you sure you want to ${isCurrentlyDisabled ? "enable" : "disable"} this account?`)) return;
    
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { isDisabled: !isCurrentlyDisabled });
        alert(`Account ${isCurrentlyDisabled ? "enabled" : "disabled"} successfully!`);
        fetchUsers();
        showUserDetails(userId);
        console.log(`Toggled account status for user ${userId}`);
    } catch (error) {
        console.error("Error toggling account status:", error);
        alert("Failed to toggle account status: " + error.message);
    }
}

// Approve Withdrawal
function approveWithdrawal(userId, index, method) {
    if (method === "Google Gift Card") {
        showApproveModal(userId, index);
    } else {
        updateWithdrawalStatus(userId, index, "Success", null);
    }
}

// Show Approve Modal
function showApproveModal(userId, index) {
    currentUserId = userId;
    currentIndex = index;
    const modal = document.getElementById("approveModal");
    const approveDetails = document.getElementById("approveDetails");
    const approveInput = document.getElementById("approveInput");

    if (modal && approveDetails && approveInput) {
        modal.style.display = "block";
        approveDetails.innerText = "Enter Gift Card Number:";
        approveInput.placeholder = "e.g., XXXX-XXXX-XXXX-XXXX";
        approveInput.value = "";
    } else {
        console.error("Approve modal elements not found");
    }
}

// Close Approve Modal
function closeApproveModal() {
    const modal = document.getElementById("approveModal");
    if (modal) {
        modal.style.display = "none";
    } else {
        console.error("Approve modal not found");
    }
}

// Submit Approval
async function submitApproval() {
    const inputValue = document.getElementById("approveInput")?.value.trim();
    if (!inputValue) {
        alert("Please enter the Gift Card Number!");
        return;
    }

    await updateWithdrawalStatus(currentUserId, currentIndex, "Success", inputValue);
    closeApproveModal();
}

// Update Withdrawal Status
async function updateWithdrawalStatus(userId, index, newStatus, giftCardNumber = null) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const withdrawalHistory = userData.withdrawalHistory || [];
            if (withdrawalHistory.length > index) {
                const existingEntry = parseWithdrawalEntry(withdrawalHistory[index]);
                withdrawalHistory[index] = {
                    action: existingEntry.action,
                    amount: existingEntry.amount,
                    status: newStatus,
                    method: existingEntry.method,
                    mobileNumber: existingEntry.mobileNumber,
                    giftCardNumber: giftCardNumber || existingEntry.giftCardNumber,
                    date: new Date().toISOString()
                };
                await updateDoc(userRef, { withdrawalHistory });
                fetchWithdrawals();
                console.log(`Updated withdrawal status for user ${userId}, index ${index}`);
            } else {
                console.error("Invalid withdrawal index");
            }
        } else {
            console.error("User not found");
        }
    } catch (error) {
        console.error("Error updating withdrawal status:", error);
    }
}

// Update User Coins
async function updateUserCoins(userId) {
    const coinInput = document.getElementById("coinInput")?.value;
    const newCoins = parseInt(coinInput);

    if (isNaN(newCoins) || newCoins < 0) {
        alert("Please enter a valid number of coins!");
        return;
    }

    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { coins: newCoins });
        alert("Coins updated successfully!");
        showUserDetails(userId);
        fetchUsers();
        console.log(`Updated coins for user ${userId}: ${newCoins}`);
    } catch (error) {
        console.error("Error updating coins:", error);
        alert("Failed to update coins: " + error.message);
    }
}

// Confirm Rejection
function confirmRejection(userId, index) {
    if (confirm("Are you sure you want to reject this withdrawal?")) {
        updateWithdrawalStatus(userId, index, "Rejected");
    }
}

// Delete User
async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?") || !confirm("This action is irreversible! Confirm again.")) return;
    
    try {
        await deleteDoc(doc(db, "users", userId));
        fetchUsers();
        console.log(`Deleted user ${userId}`);
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user: " + error.message);
    }
}

// Show User Details
async function showUserDetails(userId) {
    const userPanel = document.getElementById("userPanel");
    const panelContent = document.getElementById("userDetails");
    if (!userPanel || !panelContent) {
        console.error("User panel elements not found");
        return;
    }

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const user = userSnap.data();
            let withdrawalHistoryHTML = '<h4>Withdrawal History</h4><table><tr><th>Action</th><th>Amount</th><th>Status</th><th>Method</th><th>Gift Card Number</th><th>Date</th></tr>';
            if (user.withdrawalHistory && Array.isArray(user.withdrawalHistory)) {
                user.withdrawalHistory.forEach(entry => {
                    const { action, amount, status, method, giftCardNumber, date } = parseWithdrawalEntry(entry);
                    withdrawalHistoryHTML += `
                        <tr>
                            <td>${action}</td>
                            <td>₹${amount}</td>
                            <td>${status}</td>
                            <td>${method}</td>
                            <td>${giftCardNumber}</td>
                            <td>${date}</td>
                        </tr>`;
                });
            } else {
                withdrawalHistoryHTML += '<tr><td colspan="6">No withdrawal history</td></tr>';
            }
            withdrawalHistoryHTML += '</table>';

            panelContent.innerHTML = `
                <h3>${user.name || "Unknown"}</h3>
                <p>Email: ${user.email || "N/A"}</p>
                <p>Mobile Number: ${user.mobileNumber || "N/A"}</p>
                <p>Coins: ${user.coins || 0}</p>
                <p>Status: ${user.isDisabled ? "Disabled" : "Active"}</p>
                <div>
                    <input type="number" id="coinInput" placeholder="Enter new coin value" min="0">
                    <button onclick="updateUserCoins('${user.id}')">Update Coins</button>
                </div>
                <button onclick="toggleUserAccountStatus('${user.id}', ${user.isDisabled || false})">
                    ${user.isDisabled ? "Enable Account" : "Disable Account"}
                </button>
                ${withdrawalHistoryHTML}
                <button onclick="closeUserPanel()">Close</button>
            `;
            userPanel.classList.add("show");
            console.log(`Displayed details for user ${userId}`);
        } else {
            panelContent.innerHTML = '<p>User not found</p><button onclick="closeUserPanel()">Close</button>';
            userPanel.classList.add("show");
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
        panelContent.innerHTML = '<p>Error loading user details</p><button onclick="closeUserPanel()">Close</button>';
        userPanel.classList.add("show");
    }
}

// Close User Panel
function closeUserPanel() {
    const userPanel = document.getElementById("userPanel");
    if (userPanel) {
        userPanel.classList.remove("show");
    } else {
        console.error("User panel not found");
    }
}

// Logout
async function logout() {
    try {
        await signOut(auth);
        const adminPanel = document.getElementById('admin-panel');
        const loginSection = document.getElementById('login-section');
        if (adminPanel && loginSection) {
            adminPanel.style.display = 'none';
            loginSection.style.display = 'block';
            console.log("Logged out successfully");
        } else {
            console.error("Admin panel or login section not found");
        }
    } catch (error) {
        console.error("Error logging out:", error);
        alert("Failed to log out: " + error.message);
    }
}

// Expose functions globally
window.adminLogin = adminLogin;
window.fetchUsers = fetchUsers;
window.fetchWithdrawals = fetchWithdrawals;
window.fetchTotalEarnings = fetchTotalEarnings;
window.searchUsers = searchUsers;
window.approveWithdrawal = approveWithdrawal;
window.showApproveModal = showApproveModal;
window.closeApproveModal = closeApproveModal;
window.submitApproval = submitApproval;
window.confirmRejection = confirmRejection;
window.showUserDetails = showUserDetails;
window.closeUserPanel = closeUserPanel;
window.logout = logout;
window.deleteUser = deleteUser;
window.updateUserCoins = updateUserCoins;
window.toggleUserAccountStatus = toggleUserAccountStatus;
