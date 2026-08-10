#!/bin/bash
# dev 环境全流程联调测试
BASE="http://127.0.0.1:3000/api"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✅ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ❌ $1  -> $2"; }
check(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "$2"; fi; }

echo "===== 1. 管理员登录 ====="
ADMIN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
AT=$(echo "$ADMIN" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
[ -n "$AT" ] && ok "管理员登录成功" || bad "管理员登录" "$ADMIN"

echo "===== 2. 打卡设置（把中心设到测试坐标 23.13,113.26 半径500m） ====="
R=$(curl -s -X PUT $BASE/settings -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"checkin_lat":"23.130000","checkin_lng":"113.260000","checkin_radius":"500","work_start_time":"09:00","work_end_time":"18:00"}')
echo "$R" | grep -q '"code":0' && ok "保存打卡设置" || bad "保存打卡设置" "$R"

echo "===== 3. 配置喂食任务（今天，每天2次，keeper负责） ====="
KID=$(curl -s $BASE/users -H "Authorization: Bearer $AT" | python3 -c "
import json,sys
us=json.load(sys.stdin)['data']
print([u['id'] for u in us if u['role']=='keeper'][0])")
DATE=$(date +%F)
TASK=$(curl -s -X POST $BASE/tasks/batch -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d "{\"task_type\":\"feeding\",\"title\":\"早班喂食\",\"assignee_id\":$KID,\"cage_id\":1,\"animal_id\":1,\"feed_id\":1,\"quantity\":500,\"quantity_unit\":\"克\",\"repeat_type\":\"once\",\"start_date\":\"$DATE\",\"due_times\":[\"08:00\",\"18:00\"]}")
GID=$(echo "$TASK" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['groupId'])" 2>/dev/null)
TOTAL=$(echo "$TASK" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['total'])" 2>/dev/null)
[ "$TOTAL" = "2" ] && ok "生成2条喂食任务(group=$GID)" || bad "生成任务" "$TASK"

echo "===== 4. 饲养员登录 + 首页 ====="
KEEPER=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"keeper","password":"keeper123"}')
KT=$(echo "$KEEPER" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
[ -n "$KT" ] && ok "饲养员登录成功" || bad "饲养员登录" "$KEEPER"
HOME=$(curl -s $BASE/keeper/home -H "Authorization: Bearer $KT")
TASKS=$(echo "$HOME" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['data']['tasks']))" 2>/dev/null)
[ "$TASKS" = "2" ] && ok "首页显示2条今日待办" || bad "首页待办数" "$TASKS"
TID=$(echo "$HOME" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['tasks'][0]['id'])" 2>/dev/null)

echo "===== 5. 打卡：范围内签到 ====="
IN=$(curl -s -X POST $BASE/attendance/checkin -H "Authorization: Bearer $KT" -H 'Content-Type: application/json' -d '{"lat":23.1305,"lng":113.2605}')
echo "$IN" | grep -q '"code":0' && ok "范围内签到成功" || bad "范围内签到" "$IN"
echo "===== 6. 打卡：范围外签到（应被拒绝） ====="
OUT=$(curl -s -X POST $BASE/attendance/checkin -H "Authorization: Bearer $KT" -H 'Content-Type: application/json' -d '{"lat":24.0000,"lng":114.0000}')
echo "$OUT" | grep -q '不在打卡范围内' && ok "范围外被拒绝 ✓" || bad "范围外签到" "$OUT"
echo "===== 7. 签退 ====="
OUT2=$(curl -s -X POST $BASE/attendance/checkout -H "Authorization: Bearer $KT" -H 'Content-Type: application/json' -d '{"lat":23.1305,"lng":113.2605}')
echo "$OUT2" | grep -q '"code":0' && ok "签退成功" || bad "签退" "$OUT2"

echo "===== 8. 任务状态流转 + 提交喂食记录 ====="
curl -s -X PUT $BASE/tasks/$TID/status -H "Authorization: Bearer $KT" -H 'Content-Type: application/json' -d '{"status":"processing"}' >/dev/null
REC=$(curl -s -X POST $BASE/records/feeding -H "Authorization: Bearer $KT" -H 'Content-Type: application/json' -d "{\"task_id\":$TID,\"cage_id\":1,\"animal_id\":1,\"feed_id\":1,\"quantity\":500,\"intake\":\"正常\",\"photos\":[\"/uploads/test/1.jpg\"],\"note\":\"联调测试\"}")
echo "$REC" | grep -q '"code":0' && ok "提交喂食记录成功" || bad "喂食记录" "$REC"
T2=$(curl -s $BASE/tasks/$TID -H "Authorization: Bearer $KT")
echo "$T2" | grep -q '"status":"done"' && ok "任务自动标记完成 ✓" || bad "任务状态" "$T2"

echo "===== 9. 异常上报 + 后台处理 ====="
RP=$(curl -s -X POST $BASE/reports/abnormal -H "Authorization: Bearer $KT" -H 'Content-Type: application/json' -d '{"animal_id":2,"symptoms":"精神萎靡、食欲下降","priority":"高"}')
RID=$(echo "$RP" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
[ -n "$RID" ] && ok "异常工单上报成功(id=$RID)" || bad "异常上报" "$RP"
RH=$(curl -s -X PUT $BASE/reports/$RID -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"status":"done","resolution":"隔离观察，已用药","health":"异常"}')
echo "$RH" | grep -q '"code":0' && ok "后台处理工单成功" || bad "处理工单" "$RH"

echo "===== 10. 诊疗方案 → 自动生成用药任务 ====="
TP=$(curl -s -X POST $BASE/treatment-plans -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d "{\"animal_id\":2,\"medicine_id\":3,\"dosage\":\"2片/次\",\"start_date\":\"$DATE\",\"duration_days\":2,\"times\":[\"09:00\",\"17:00\"]}")
echo "$TP" | grep -q '"code":0' && ok "诊疗方案保存(生成2天×2次用药任务)" || bad "诊疗方案" "$TP"

echo "===== 11. 繁育计划 → 自动生成跟进任务 ====="
FEMALE=$(curl -s "$BASE/animals" -H "Authorization: Bearer $AT" | python3 -c "
import json,sys
as2=json.load(sys.stdin)['data']
f=[a for a in as2 if a['sex']=='母']
print(f[0]['id'])")
BP=$(curl -s -X POST $BASE/breeding-plans -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d "{\"plan_type\":\"妊娠\",\"female_animal_id\":$FEMALE,\"male_animal_id\":2,\"start_date\":\"$DATE\",\"due_date\":\"$(date -d '+3 days' +%F)\",\"remark\":\"联调测试\"}")
echo "$BP" | grep -q '"code":0' && ok "繁育计划保存(生成3天跟进任务)" || bad "繁育计划" "$BP"

echo "===== 12. 逾期提醒（把一条任务改到昨天制造逾期，触发扫描） ====="
echo "$T2" | python3 -c "
import json,sys
t=json.load(sys.stdin)['data']
print(t['id'], t['task_date'])" >/tmp/taskinfo.txt
PAST=$(date -d '-2 days' +%F)
curl -s -X PUT $BASE/tasks/$TID -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d "{\"task_date\":\"$PAST\",\"due_time\":\"08:00\"}" >/dev/null
sleep 35
NT=$(curl -s $BASE/notifications -H "Authorization: Bearer $KT")
echo "$NT" | grep -q 'task_overdue' && ok "逾期提醒已推送饲养员 ✓" || bad "逾期提醒" "$NT"
NA=$(curl -s $BASE/notifications -H "Authorization: Bearer $AT")
echo "$NA" | grep -q 'task_overdue' && ok "逾期提醒已推送管理员 ✓" || bad "管理员提醒" "$NA"

echo "===== 13. 考勤记录查询 ====="
ATT=$(curl -s "$BASE/attendance?date=$DATE" -H "Authorization: Bearer $AT")
echo "$ATT" | grep -q '"check_in_at"' && ok "后台查看考勤记录" || bad "考勤查询" "$ATT"
HIST=$(curl -s "$BASE/attendance/history?month=$(date +%Y-%m)" -H "Authorization: Bearer $KT")
echo "$HIST" | grep -q '"checked"' && ok "饲养员查看打卡记录" || bad "打卡记录" "$HIST"

echo "===== 14. 统计看板 ====="
DASH=$(curl -s $BASE/stats/dashboard -H "Authorization: Bearer $AT")
echo "$DASH" | grep -q '"checkedToday"' && ok "统计看板" || bad "看板" "$DASH"

echo ""
echo "================ 测试完成: 通过 $PASS / 失败 $FAIL ================"
