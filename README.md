# HostelPro - Hostel Management System

HostelPro is a comprehensive, web-based management system designed to streamline the daily operations of a hostel. It provides a robust platform for managing residents, rooms, billing, expenses, and attendance with a professional and user-friendly interface.

## 🚀 Key Features

### 1. Resident Management
*   **Admissions**: Easy onboarding of new residents with personal details (CNIC, Phone, Guardian info).
*   **Room Allocation**: Assign residents to specific rooms and seats.
*   **History Tracking**: Keep a complete record of past residents and their stay duration.
*   **Move-Out Settlement**: Automated calculation of refunds/dues upon move-out.

### 2. Room & Seat Management
*   **Inventory Control**: Manage rooms, capacities, and seat availability.
*   **Visual Dashboard**: Quickly see occupied vs. available beds.

### 3. Billing & Finance
*   **Automated Invoicing**: Generate monthly invoices including rent, mess charges, and custom additions.
*   **Payment Tracking**: Record partial or full payments with receipt generation.
*   **Professional Receipts**: Print dual-copy receipts (Student/Hostel copy) with cut lines.
*   **Security Deposits**: specialized handling for security deposits and refunds.

### 4. Mess & Attendance
*   **Daily Tracking**: Mark attendance for Breakfast, Lunch, and Dinner.
*   **Cost Calculation**: Automatically calculate monthly mess bills based on daily attendance.

### 5. Expense Tracking
*   **Operational Expenses**: Log daily hostel expenses (Groceries, Maintenance, Utilities).
*   **Categorization**: Organize expenses for better financial reporting.

### 6. Reports & Audit
*   **Financial Reports**: View monthly income vs. expense summaries.
*   **Audit Log**: Track every system action (who did what and when) for security and accountability.

## 🛠 Tech Stack

*   **Frontend**: React.js (Vite)
*   **Styling**: CSS Modules / Custom CSS (Responsive Design)
*   **Database**: Supabase (PostgreSQL)
*   **Authentication**: Supabase Auth
*   **Routing**: React Router DOM

## 📂 Project Structure

```
src/
├── components/         # Reusable UI components (Buttons, Cards, Modals)
├── context/            # Global State (Auth, Data, Toast Notifications)
├── hooks/              # Custom React Hooks
├── lib/                # Utilities, Constants, and Helper functions
├── modules/            # Main Application Features
│   ├── AttendanceModule.jsx
│   ├── BillingModule.jsx
│   ├── ResidentModule.jsx
│   ├── RoomModule.jsx
│   ├── ExpensesModule.jsx
│   └── ...
└── App.jsx             # Main Application Entry Point
```

## 📖 Usage Overview

1.  **Dashboard**: The landing page showing key statistics (Occupancy, Revenue).
2.  **Rooms**: Define your hostel structure first (create rooms and seats).
3.  **Residents**: Add new students and assign them to rooms.
4.  **Attendance**: Mark daily mess usage to ensure accurate billing.
5.  **Billing**: At month-end, generate invoices and record incoming payments.
6.  **Expenses**: Log any outgoing money for maintenance or supplies.

---
*Built for efficiency and reliability.*
"# hostel-management-system" 
