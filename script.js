import { auth, db } from "./app.js";
import { 
    getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";

// Global variables to store approval context
let currentUserId, currentIndex;

// Admin Login
async function adminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const loginMessage = document.getElementById('loginMessage');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists() && adminSnap.data().Role === "admin") {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';

            fetchUsers();
            fetchWithdrawals();
            fetchTotalEarnings();
        } else {
            loginMessage.innerText = "You are not an admin!";
            await signOut(auth);
        }
    } catch (error) {
        loginMessage.innerText = error.message;
    }
}

// Parse Withdrawal Entry
function parseWithdrawalEntry(entry) {
    if (typeof entry === "string") { // Backward compatibility
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
                date: "N/A",
                transactionId: "N/A" // पुराना डेटा, कोई ID नहीं
            };
        }
        return { 
            action: "Unknown",
            amount: "0", 
            status: "Unknown", 
            method: "N/A", 
            mobileNumber: "N/A",
            giftCardNumber: "N/A",
            date: "N/A",
            transactionId: "N/A"
        };
    }
    // नया ऑब्जेक्ट-आधारित डेटा पार्स करें
    return {
        action: entry.action || "Unknown",
        amount: entry.amount || "0",
        status: entry.status || "Unknown",
        method: entry.method || "N/A",
        mobileNumber: entry.method && entry.action === "Recharged" ? entry.method.split(" via ")[0] : "N/A",
        giftCardNumber: entry.giftCardNumber || "N/A",
        date: entry.date || "N/A",
        transactionId: entry.transactionId || "N/A" // ट्रांज़ैक्शन आईडी निकालें
    };
}

// Fetch Users
async function fetchUsers() {
    const tableBody = document.querySelector("#users-table tbody");
    tableBody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users = [];
        querySnapshot.forEach(docSnap => {
            users.push({ id: docSnap.id, data: docSnap.data() });
        });
        users.sort((a, b) => (b.data.coins || 0) - (a.data.coins || 0));

        users.forEach(({ id, data: user }) => {
            const totalWithdrawn = calculateTotalWithdrawn(user.withdrawalHistory);
            const registerDate = user.registerDate 
                ? new Date(user.registerDate.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
                : "N/A";
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
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

// Fetch Withdrawals
async function fetchWithdrawals() {
    const tableBody = document.querySelector("#withdrawals-table tbody");
    const historyTableBody = document.querySelector("#withdrawals-history-table tbody");
    tableBody.innerHTML = '';
    historyTableBody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach(docSnap => {
            const userData = docSnap.data();
            const userId = docSnap.id;
            const registerDate = userData.registerDate 
                ? new Date(userData.registerDate.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
                : "N/A";

            if (userData.withdrawalHistory && Array.isArray(userData.withdrawalHistory)) {
                userData.withdrawalHistory.forEach((entry, index) => {
                    const { action, amount, status, method, giftCardNumber, date, transactionId } = parseWithdrawalEntry(entry);
                    
                    if (status === "Pending") {
                        const approveButton = method === "Google Play Gift Card"
                            ? `<button onclick="showApproveModal('${userId}', ${index}, '${method}')">Approve</button>`
                            : `<button onclick="approveWithdrawal('${userId}', ${index}, '${method}')">Approve</button>`;
                        const row = `<tr>
                            <td>${userData.name || "Unknown"}</td>
                            <td>${transactionId}</td> <!-- ट्रांज़ैक्शन आईडी दिखाएं -->
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
                        tableBody.innerHTML += row;
                    }

                    const historyApproveButton = method === "Google Play Gift Card" && status !== "Success"
                        ? `<button onclick="showApproveModal('${userId}', ${index}, '${method}')">Approve</button>`
                        : "";
                    const historyRow = `<tr>
                        <td>${userData.name || "Unknown"}</td>
                        <td>${transactionId}</td> <!-- ट्रांज़ैक्शन आईडी दिखाएं -->
                        <td>${action}</td>
                        <td>₹${amount}</td>
                        <td>${method}</td>
                        <td>${giftCardNumber}</td>
                        <td>${status}</td>
                        <td>${new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                        <td>${historyApproveButton}</td>
                    </tr>`;
                    historyTableBody.innerHTML += historyRow;
                });
            }
        });
    } catch (error) {
        console.error("Error fetching withdrawals:", error);
    }
}


// Calculate Total Withdrawn
function calculateTotalWithdrawn(history) {
    if (!history) return 0;
    return history.reduce((total, entry) => {
        const { amount, status } = parseWithdrawalEntry(entry);
        // केवल सफल निकासी की गणना करें
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
async function searchUsers() {
    const searchValue = document.getElementById("searchUser").value.toLowerCase();
    const tableBody = document.querySelector("#users-table tbody");
    tableBody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users = [];
        querySnapshot.forEach(docSnap => {
            const user = docSnap.data();
            if (user.name?.toLowerCase().includes(searchValue) || user.email?.toLowerCase().includes(searchValue)) {
                users.push({ id: docSnap.id, data: user });
            }
        });
        users.sort((a, b) => (b.data.coins || 0) - (a.data.coins || 0));

        users.forEach(({ id, data: user }) => {
            const totalWithdrawn = calculateTotalWithdrawn(user.withdrawalHistory);
            const registerDate = user.registerDate 
                ? new Date(user.registerDate.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
                : "N/A";
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
    } catch (error) {
        console.error("Error searching users:", error);
    }
}

// Approve Withdrawal
async function approveWithdrawal(userId, index, method) {
    if (method === "Google Play Gift Card") {
        showApproveModal(userId, index, method);
    } else {
        await updateWithdrawalStatus(userId, index, "Success");
    }
}

// Show Approve Modal (For Google Play Gift Card)
function showApproveModal(userId, index, method) {
    currentUserId = userId;
    currentIndex = index;
    const modal = document.getElementById("approveModal");
    const approveDetails = document.getElementById("approveDetails");
    const approveInput = document.getElementById("approveInput");

    modal.style.display = "block";
    approveDetails.innerText = "Enter Google Play Gift Card Number:";
    approveInput.placeholder = "e.g., XXXX-XXXX-XXXX-XXXX";
    approveInput.value = "";
}

// Close Approve Modal
function closeApproveModal() {
    document.getElementById("approveModal").style.display = "none";
}

// Submit Approval (For Google Play Gift Card)
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
                    ...existingEntry, // पुरानी एंट्री से सभी डेटा कॉपी करें
                    status: newStatus,
                    giftCardNumber: giftCardNumber || existingEntry.giftCardNumber,
                    date: new Date().toISOString()
                };
                await updateDoc(userRef, { withdrawalHistory });
                fetchWithdrawals();
                fetchTotalEarnings();
            }
        }
    } catch (error) {
        console.error("Error updating withdrawal status:", error);
        alert("Failed to update withdrawal status: " + error.message);
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
    if (!confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} this user?`)) {
        return;
    }
    try {
        const userRef = doc(db, "users", userId);
        if (isBlocked) {
            await updateDoc(userRef, {
                block_until: null,
                suspicious_count: 0
            });
            alert("User unblocked successfully!");
        } else {
            const blockUntil = new Date();
            blockUntil.setHours(blockUntil.getHours() + 24);
            await updateDoc(userRef, {
                block_until: blockUntil,
                suspicious_count: 5
            });
            alert("User blocked for 24 hours!");
        }
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
    if (confirm("Are you sure you want to delete this user?")) {
        if (confirm("This action is irreversible! Confirm again.")) {
            try {
                await deleteDoc(doc(db, "users", userId));
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
            const registerDate = user.registerDate 
                ? new Date(user.registerDate.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
                : "N/A";
            const isBlocked = user.block_until && new Date(user.block_until.toDate()) > new Date();
            const blockStatus = isBlocked 
                ? `Blocked until ${new Date(user.block_until.toDate()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                : "Not Blocked";
            panelContent.innerHTML = `
                <h3>${user.name || "Unknown"}</h3>
                <p>Email: ${user.email || "N/A"}</p>
                <p>Mobile Number: ${user.mobileNumber || "N/A"}</p>
                <p>Coins: ${user.coins || 0}</p>
                <p>Register Date: ${registerDate}</p>
                <p>Block Status: ${blockStatus}</p>
                <div>
                    <input type="number" id="coinInput" placeholder="Enter new coin value" min="0">
                    <button onclick="updateUserCoins('${userId}')">Update Coins</button>
                </div>
                <button onclick="closeUserPanel()">Close</button>
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
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
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
window.toggleBlockUser = toggleBlockUser;