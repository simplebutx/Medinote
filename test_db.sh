#!/bin/sh
cat << 'SQL' > query.sql
SELECT id, user_id, hospital_name, is_active FROM medication_schedule;
SQL
mysql -h mysql -u root -proot medic < query.sql
