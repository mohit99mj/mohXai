import { auth, db } from "./app.js";
import { 
    getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";

// Global variables
let currentUserId, currentIndex;
let cachedUsers = null;
let cachedWithdrawals = null;

// Check authentication state when the page loads
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists() && adminSnap.data().Role === "admin") {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            
            fetchUsers();
            fetchWithdrawals();
            fetchTotalEarnings();
        } else {
            await signOut(auth);
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('admin-panel').style.display = 'none';
        }
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'none';
    }
});

// Admin Login
async function adminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const loginMessage = document.getElementById('loginMessage');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle showing the admin panel
    } catch (error) {
        loginMessage.innerText = error.message;
    }
}

// Parse Withdrawal Entry
function parseWithdrawalEntry(entry) {
    if (typeof entry === "string") {
        return { action: "Unknown", amount: "0", status: "Unknown", method: "N/A", giftCardNumber: "N/A", date: "N/A", transactionId: "N/A" };
    }
    return {
        action: entry.action || "Unknown",
        amount: entry.amount || "0",
        status: entry.status || "Unknown",
        method: entry.method || "N/A",
        giftCardNumber: entry.giftCardNumber || "N/A",
        date: entry.date || "N/A",
        transactionId: entry.transactionId || "N/A"
    };
}

// Fetch Users with Caching
async function fetchUsers() {
    const tableBody = document.querySelector("#users-table tbody");
    tableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

    if (cachedUsers) {
        displayUsers(cachedUsers);
    }

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users = [];
        querySnapshot.forEach(docSnap => {
            users.push({ id: docSnap.id, data: docSnap.data() });
        });
        users.sort((a, b) => (b.data.coins || 0) - (a.data.coins || 0));
        
        cachedUsers = users;
        displayUsers(cachedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        tableBody.innerHTML = '<tr><td colspan="7">Error loading users.</td></tr>';
    }
}

// Display Users Data
function displayUsers(users) {
    const tableBody = document.querySelector("#users-table tbody");
    tableBody.innerHTML = '';

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
        return;
    }

    users.forEach(({ id, data: user }) => {
        const totalWithdrawn = calculateTotalWithdrawn(user.withdrawalHistory);
        const registerDate = user.registerDate ? new Date(user.registerDate.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "N/A";
        const isBlocked = user.block_until && new Date(user.block_until.toDate()) > new Date();
        const blockButtonText = isBlocked ? "Unblock" : "Block";
        const row = `<tr onclick="showUserDetails('${id}')">
            <td>${user.name || "Unknown"}</td>
            <td>${user.email || "N/A"}</td>
            <td>${user.mobileNumber || "N/A"}</td>
            <td>${user.coins || 0}</td>
            <td>₹${totalWithdrawn}</td>
            <td>${registerDate}</td>
            <td>
                <button onclick="event.stopPropagation(); toggleBlockUser('${id}', ${isBlocked})">${blockButtonText}</button>
                <button onclick="event.stopPropagation(); deleteUser('${id}')">Delete</button>
            </td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

// Fetch Withdrawals with Caching
async function fetchWithdrawals() {
    const pendingTable = document.querySelector("#withdrawals-table tbody");
    const historyTable = document.querySelector("#withdrawals-history-table tbody");
    pendingTable.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
    historyTable.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

    if (cachedWithdrawals) {
        displayWithdrawals(cachedWithdrawals);
    }

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const withdrawals = [];
        querySnapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.withdrawalHistory && Array.isArray(userData.withdrawalHistory)) {
                userData.withdrawalHistory.forEach((entry, index) => {
                    withdrawals.push({
                        userId: docSnap.id,
                        userName: userData.name || "Unknown",
                        registerDate: userData.registerDate ? new Date(userData.registerDate.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "N/A",
                        index: index,
                        data: parseWithdrawalEntry(entry)
                    });
                });
            }
        });

        cachedWithdrawals = withdrawals;
        displayWithdrawals(cachedWithdrawals);
    } catch (error) {
        console.error("Error fetching withdrawals:", error);
        pendingTable.innerHTML = '<tr><td colspan="9">Error loading withdrawals.</td></tr>';
        historyTable.innerHTML = '<tr><td colspan="8">Error loading history.</td></tr>';
    }
}

// Display Withdrawals Data
function displayWithdrawals(withdrawals) {
    const pendingTable = document.querySelector("#withdrawals-table tbody");
    const historyTable = document.querySelector("#withdrawals-history-table tbody");
    pendingTable.innerHTML = '';
    historyTable.innerHTML = '';

    withdrawals.forEach(({ userId, userName, registerDate, index, data }) => {
        const { action, amount, status, method, giftCardNumber, date, transactionId } = data;

        if (status === "Pending") {
            const approveButton = method === "Google Play Gift Card"
                ? `<button onclick="showApproveModal('${userId}', ${index}, '${method}')">Approve</button>`
                : `<button onclick="approveWithdrawal('${userId}', ${index}, '${method}')">Approve</button>`;
            const row = `<tr>
                <td>${userName}</td>
                <td>${transactionId}</td>
                <td>${action}</td>
                <td>₹${amount}</td>
                <td>${method}</td>
                <td>${giftCardNumber}</td>
                <td>${status}</td>
                <td>${registerDate}</td>
                <td>
                    ${approveButton}
                    <button onclick="confirmRejection('${userId}', ${index})">Reject</button>
                </td>
            </tr>`;
            pendingTable.innerHTML += row;
        }

        const historyRow = `<tr>
            <td>${userName}</td>
            <td>${transactionId}</td>
            <td>${action}</td>
            <td>₹${amount}</td>
            <td>${method}</td>
            <td>${giftCardNumber}</td>
            <td>${status}</td>
            <td>${new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
        </tr>`;
        historyTable.innerHTML += historyRow;
    });

    if (pendingTable.innerHTML === '') pendingTable.innerHTML = '<tr><td colspan="9">No pending requests.</td></tr>';
    if (historyTable.innerHTML === '') historyTable.innerHTML = '<tr><td colspan="8">No withdrawal history.</td></tr>';
}


// Calculate Total Withdrawn
function calculateTotalWithdrawn(history) {
    if (!history) return 0;
    return history.reduce((total, entry) => {
        const { amount, status } = parseWithdrawalEntry(entry);
        if (status === "Success" || status === "Paid") {
            return total + (parseFloat(amount) || 0);
        }
        return total;
    }, 0);
}

// Fetch Total Earnings
async function fetchTotalEarnings() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let total = 0;
        let totalCoins = 0;
        querySnapshot.forEach(docSnap => {
            const userData = docSnap.data();
            total += calculateTotalWithdrawn(userData.withdrawalHistory);
            totalCoins += userData.coins || 0;
        });
        document.getElementById("total-earnings").innerText = `Total Earnings: ₹${total.toFixed(2)}`;
        document.getElementById("total-coins").innerText = `Total Coins: ${totalCoins}`;
    } catch (error) {
        console.error("Error fetching total earnings:", error);
    }
}

// Search Users
function searchUsers() {
    const searchValue = document.getElementById("searchUser").value.toLowerCase();
    if (!cachedUsers) return;

    const filteredUsers = cachedUsers.filter(user => 
        user.data.name?.toLowerCase().includes(searchValue) || 
        user.data.email?.toLowerCase().includes(searchValue)
    );
    displayUsers(filteredUsers);
}

// Approve Withdrawal
async function approveWithdrawal(userId, index, method) {
    if (method === "Google Play Gift Card") {
        showApproveModal(userId, index, method);
    } else {
        await updateWithdrawalStatus(userId, index, "Success");
    }
}

// Show Approve Modal
function showApproveModal(userId, index) {
    currentUserId = userId;
    currentIndex = index;
    document.getElementById("approveModal").style.display = "block";
    document.getElementById("approveDetails").innerText = "Enter Google Play Gift Card Number:";
    document.getElementById("approveInput").value = "";
}

// Close Approve Modal
function closeApproveModal() {
    document.getElementById("approveModal").style.display = "none";
}

// Submit Approval
async function submitApproval() {
    const inputValue = document.getElementById("approveInput").value.trim();
    if (!inputValue) {
        alert("Please enter the Google Play Gift Card Number!");
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
                    ...existingEntry,
                    status: newStatus,
                    giftCardNumber: giftCardNumber || existingEntry.giftCardNumber,
                    date: new Date().toISOString()
                };
                await updateDoc(userRef, { withdrawalHistory });
                
                // Refresh data
                cachedWithdrawals = null;
                fetchWithdrawals();
                fetchTotalEarnings();
            }
        }
    } catch (error) {
        console.error("Error updating withdrawal status:", error);
        alert("Failed to update status: " + error.message);
    }
}

// Update User Coins
async function updateUserCoins(userId) {
    const coinInput = document.getElementById("coinInput").value;
    const newCoins = parseInt(coinInput);

    if (isNaN(newCoins) || newCoins < 0) {
        alert("Please enter a valid number of coins!");
        return;
    }

    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { coins: newCoins });
        alert("Coins updated successfully!");
        
        // Refresh data
        cachedUsers = null;
        showUserDetails(userId);
        fetchUsers();
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

// Toggle Block/Unblock User
async function toggleBlockUser(userId, isBlocked) {
    if (!confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} this user?`)) return;

    try {
        const userRef = doc(db, "users", userId);
        if (isBlocked) {
            await updateDoc(userRef, { block_until: null, suspicious_count: 0 });
            alert("User unblocked successfully!");
        } else {
            const blockUntil = new Date();
            blockUntil.setHours(blockUntil.getHours() + 24);
            await updateDoc(userRef, { block_until: blockUntil, suspicious_count: 5 });
            alert("User blocked for 24 hours!");
        }
        
        // Refresh data
        cachedUsers = null;
        fetchUsers();
        if (document.getElementById("userPanel").classList.contains("show")) {
            showUserDetails(userId);
        }
    } catch (error) {
        console.error("Error toggling block status:", error);
        alert("Failed to toggle block status: " + error.message);
    }
}

// Delete User
async function deleteUser(userId) {
    if (confirm("Are you sure you want to delete this user? This action is irreversible!")) {
        try {
            await deleteDoc(doc(db, "users", userId));
            
            // Refresh data
            cachedUsers = null;
            cachedWithdrawals = null;
            fetchUsers();
            fetchWithdrawals();
            fetchTotalEarnings();
            closeUserPanel();
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user: " + error.message);
        }
    }
}

// Show User Details
async function showUserDetails(userId) {
    const userPanel = document.getElementById("userPanel");
    const panelContent = document.getElementById("userDetails");

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const user = userSnap.data();
            const registerDate = user.registerDate ? new Date(user.registerDate.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "N/A";
            const isBlocked = user.block_until && new Date(user.block_until.toDate()) > new Date();
            const blockStatus = isBlocked 
                ? `Blocked until ${new Date(user.block_until.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                : "Not Blocked";
            panelContent.innerHTML = `
                <button onclick="closeUserPanel()" class="close-panel-btn">×</button>
                <h3>${user.name || "Unknown"}</h3>
                <p><strong>Email:</strong> ${user.email || "N/A"}</p>
                <p><strong>Mobile:</strong> ${user.mobileNumber || "N/A"}</p>
                <p><strong>Coins:</strong> ${user.coins || 0}</p>
                <p><strong>Registered:</strong> ${registerDate}</p>
                <p><strong>Status:</strong> ${blockStatus}</p>
                <div>
                    <input type="number" id="coinInput" placeholder="Set new coin value" min="0">
                    <button onclick="updateUserCoins('${userId}')">Update Coins</button>
                </div>
            `;
            userPanel.classList.add("show");
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
        alert("Failed to fetch user details: " + error.message);
    }
}

// Close User Panel
function closeUserPanel() {
    document.getElementById("userPanel").classList.remove("show");
}

// Logout
async function logout() {
    try {
        await signOut(auth);
        // onAuthStateChanged will handle hiding the admin panel
    } catch (error) {
        console.error("Error logging out:", error);
        alert("Failed to log out: " + error.message);
    }
}

// Expose functions to the global window object
window.adminLogin = adminLogin;
window.logout = logout;
window.searchUsers = searchUsers;
window.approveWithdrawal = approveWithdrawal;
window.showApproveModal = showApproveModal;
window.closeApproveModal = closeApproveModal;
window.submitApproval = submitApproval;
window.confirmRejection = confirmRejection;
window.showUserDetails = showUserDetails;
window.closeUserPanel = closeUserPanel;
window.deleteUser = deleteUser;
window.updateUserCoins = updateUserCoins;
window.toggleBlockUser = toggleBlockUser;