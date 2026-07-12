import pulp
import random

# ================== DỮ LIỆU ==================
T = 26  # Tổng tuần
horizon = 8  # Chân trời lập kế hoạch
current_week = 1

demand = [random.randint(80, 150) for _ in range(T)]  # Nhu cầu giả định
print("Demand 26 tuần:", demand)

capacity = 200
prod_cost = 10
hold_cost = 2
setup_cost = 100
initial_inventory = 0

# ================== HÀM GIẢI MILP CHO MỘT HORIZON ==================
def solve_horizon(start, demands, init_inv):
    model = pulp.LpProblem("Production_Planning", pulp.LpMinimize)
    weeks = list(range(start, start + horizon))
    
    X = pulp.LpVariable.dicts("Produce", weeks, lowBound=0, cat='Continuous')
    Y = pulp.LpVariable.dicts("Setup", weeks, cat='Binary')
    S = pulp.LpVariable.dicts("Inventory", weeks, lowBound=0, cat='Continuous')
    
    # Mục tiêu
    model += pulp.lpSum([prod_cost * X[t] + hold_cost * S[t] + setup_cost * Y[t] for t in weeks])
    
    # Tồn kho tuần đầu
    model += S[start-1] == init_inv  # dummy cho tuần trước
    
    for t in weeks:
        # Cân bằng tồn kho
        if t == start:
            model += S[t] == init_inv + X[t] - demands[t-1]
        else:
            model += S[t] == S[t-1] + X[t] - demands[t-1]
        
        # Năng lực + setup
        model += X[t] <= capacity * Y[t]
        model += X[t] >= 0
    
    model.solve(pulp.PULP_CBC_CMD(msg=False))
    
    # Trả về quyết định tuần đầu tiên
    first_produce = X[start].varValue
    first_inventory = S[start].varValue
    return first_produce, first_inventory

# ================== ROLLING HORIZON ==================
production_plan = [0] * T
inventory_plan = [0] * T
current_inv = initial_inventory

print("\n=== ROLLING HORIZON ===")
for week in range(1, T + 1):
    print(f"\nTuần {week}: Đang lập kế hoạch...")
    
    # Cắt demand cho horizon
    end = min(week + horizon - 1, T)
    current_demands = demand[week-1:end]
    
    # Giải MILP
    produce, next_inv = solve_horizon(week, current_demands, current_inv)
    
    production_plan[week-1] = round(produce)
    inventory_plan[week-1] = round(next_inv)
    current_inv = next_inv
    
    print(f"  → Sản xuất tuần {week}: {production_plan[week-1]}")
    print(f"  → Tồn kho cuối tuần {week}: {inventory_plan[week-1]}")

print("\n=== KẾT QUẢ CUỐI CÙNG ===")
print("Tuần | Nhu cầu | Sản xuất | Tồn kho cuối")
for w in range(T):
    print(f"{w+1:4} | {demand[w]:7} | {production_plan[w]:8} | {inventory_plan[w]:10}")