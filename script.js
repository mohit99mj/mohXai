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
    tableBody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach(docSnap => {
            const user = docSnap.data();
            const totalWithdrawn = calculateTotalWithdrawn(user.withdrawalHistory);
            const row = `<tr onclick="showUserDetails('${docSnap.id}')">
                <td>${user.name || "Unknown"}</td>
                <td>${user.email || "N/A"}</td>
                <td>${user.mobileNumber || "N/A"}</td>
                <td>${user.coins || 0}</td>
                <td>₹${totalWithdrawn}</td>
                <td><button onclick="event.stopPropagation(); deleteUser('${docSnap.id}')">Delete</button></td>
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

            if (userData.withdrawalHistory && Array.isArray(userData.withdrawalHistory)) {
                userData.withdrawalHistory.forEach((entry, index) => {
                    const { action, amount, status, method, giftCardNumber, date } = parseWithdrawalEntry(entry);
                    if (status === "Pending") {
                        const row = `<tr>
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
                    historyTableBody.innerHTML += `<tr>
                        <td>${userData.name || "Unknown"}</td>
                        <td>${action}</td>
                        <td>₹${amount}</td>
                        <td>${method}</td>
                        <td>${giftCardNumber}</td>
                        <td>${status}</td>
                        <td>${date}</td>
                    </tr>`;
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
        document.getElementById("total-earnings").innerText = `₹${total.toFixed(2)}`;
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
        querySnapshot.forEach(docSnap => {
            const user = docSnap.data();
            if (user.name?.toLowerCase().includes(searchValue) || user.email?.toLowerCase().includes(searchValue)) {
                const totalWithdrawn = calculateTotalWithdrawn(user.withdrawalHistory);
                const row = `<tr onclick="showUserDetails('${docSnap.id}')">
                    <td>${user.name || "Unknown"}</td>
                    <td>${user.email || "N/A"}</td>
                    <td>${user.mobileNumber || "N/A"}</td>
                    <td>${user.coins || 0}</td>
                    <td>₹${totalWithdrawn}</td>
                    <td><button onclick="event.stopPropagation(); deleteUser('${docSnap.id}')">Delete</button></td>
                </tr>`;
                tableBody.innerHTML += row;
            }
        });
    } catch (error) {
        console.error("Error searching users:", error);
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

// Show Approve Modal (Only for Google Gift Card)
function showApproveModal(userId, index) {
    currentUserId = userId;
    currentIndex = index;
    const modal = document.getElementById("approveModal");
    const approveDetails = document.getElementById("approveDetails");
    const approveInput = document.getElementById("approveInput");

    modal.style.display = "block";
    approveDetails.innerText = "Enter Gift Card Number:";
    approveInput.placeholder = "e.g., XXXX-XXXX-XXXX-XXXX";
    approveInput.value = "";
}

// Close Approve Modal
function closeApproveModal() {
    document.getElementById("approveModal").style.display = "none";
}

// Submit Approval (Only for Google Gift Card)
async function submitApproval() {
    const inputValue = document.getElementById("approveInput").value.trim();
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
            }
        }
    } catch (error) {
        console.error("Error updating withdrawal status:", error);
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
    if (confirm("Are you sure you want to delete this user?")) {
        if (confirm("This action is irreversible! Confirm again.")) {
            try {
                await deleteDoc(doc(db, "users", userId));
                fetchUsers();
            } catch (error) {
                console.error("Error deleting user:", error);
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
            panelContent.innerHTML = `
                <h3>${user.name || "Unknown"}</h3>
                <p>Email: ${user.email || "N/A"}</p>
                <p>Mobile Number: ${user.mobileNumber || "N/A"}</p>
                <p>Coins: ${user.coins || 0}</p>
                <button onclick="closeUserPanel()">Close</button>
            `;
            userPanel.classList.add("show");
        }
    } catch (error) {
        console.error("Error fetching user details:", error);
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