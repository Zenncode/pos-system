---
description: Employee management — list, create, update, delete employees, manage shifts and roles.
agent: employee
---

Employee command $ARGUMENTS (default: list all):

1. Check if employee data exists in the system — query the database or config
2. If employees are defined, display:
   - Employee list with IDs and roles
   - Active/inactive status
   - Recent activity or shifts
3. If no employees defined, output: "No employee records found — add employee data to POS-API or POS-APP configuration"
4. Use `/api` or `/app` routes if employee service is implemented

**Note:** This is a placeholder command. The POS system currently focuses on products, customers, orders, and shifts. Employee functionality can be added by:
- Adding employee service to POS-API
- Creating employee routes and services
- Implementing employee data model