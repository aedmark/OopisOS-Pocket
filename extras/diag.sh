echo "===== OopisOS Core Test Suite v5 Initializing ====="
echo "This script tests all non-interactive core functionality, now with maximum paranoia."
delay 200
echo "---------------------------------------------------------------------"
echo ""
delay 200
echo "--- Phase 1: Creating dedicated test user and workspace ---"
delay 200
login root mcgoopis
delay 200
useradd diagUser
testpass
testpass
delay 400
mkdir -p /home/diagUser/diag_workspace/
chown diagUser /home/diagUser/diag_workspace/
groupadd testgroup
chgrp testgroup /home/diagUser/diag_workspace/
chmod 775 /home/diagUser/diag_workspace/

login diagUser testpass
echo "Current User (expected: diagUser):"
delay 400
whoami
echo "Current Path after login (expected: /home/diagUser):"
pwd
cd /home/diagUser/diag_workspace
echo "---------------------------------------------------------------------"

echo ""
echo "--- Phase 2: Creating diagnostic assets ---"
echo "Creating basic FS assets..."
mkdir -p src mv_test_dir overwrite_dir find_test/subdir zip_test/nested_dir "a dir with spaces"
mkdir -p recursive_test/level2/level3
delay 400
echo  "Inflating text/diff assets..."
echo -e "line one\nline two\nline three" > diff_a.txt
echo -e "line one\nline 2\nline three" > diff_b.txt
delay 400
echo "Building permissions assets..."
echo "I should not be executable" > exec_test.sh; chmod 600 exec_test.sh
touch preserve_perms.txt; chmod 700 preserve_perms.txt
echo "Dispensing data processing assets..."
delay 400
echo -e "zeta\nalpha\nbeta\nalpha\n10\n2" > sort_test.txt
echo "The quick brown fox." > text_file.txt
echo -e "apple\nbanana\napple\napple\norange\nbanana" > uniq_test.txt
echo -e "id,value,status\n1,150,active\n2,80,inactive\n3,200,active" > awk_test.csv
echo "Generating xargs assets..."
delay 400
touch file1.tmp file2.tmp file3.tmp
echo "Finding assets..."
touch find_test/a.txt find_test/b.tmp find_test/subdir/c.tmp
chmod 777 find_test/a.txt
delay 400
echo "Zipping assets..."
echo "file one content" > zip_test/file1.txt
echo "nested file content" > zip_test/nested_dir/file2.txt
delay 400
echo "Scripting assets..."
echo '#!/bin/oopis_shell' > arg_test.sh
echo 'echo "Arg 1: $1, Arg 2: $2, Arg Count: $#, All Args: $@" ' >> arg_test.sh
chmod 700 arg_test.sh
delay 400
echo "Sorting assets..."
touch -d "2 days ago" old.ext
touch -d "1 day ago" new.txt
echo "short" > small.log
echo "this is a very long line" > large.log
delay 400
echo "Assembling recursive test assets..."
echo "I am a secret" > recursive_test/secret.txt
echo "I am a deeper secret" > recursive_test/level2/level3/deep_secret.txt
delay 400
echo "Electing state management assets..."
echo "Original State" > state_test.txt
echo "Asset creation complete."
delay 400
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 3: Testing Core FS Commands (Expanded) ====="
delay 400
echo "--- Test: diff, cp -p, mv ---"
diff diff_a.txt diff_b.txt
cp -p preserve_perms.txt preserve_copy.sh
echo "Verifying preserved permissions:"
ls -l preserve_perms.txt preserve_copy.sh
mv exec_test.sh mv_test_dir/
ls mv_test_dir/
delay 200
echo "--- Test: touch -d and -t ---"
touch -d "1 day ago" old_file.txt
touch -t 202305201200.30 specific_time.txt
ls -l old_file.txt specific_time.txt
echo "--- Test: ls sorting flags (-t, -S, -X, -r) ---"
echo "Sorting by modification time (newest first):"
ls -lt
echo "Sorting by size (largest first):"
ls -lS
delay 200
echo "Sorting by extension:"
ls -lX
delay 400
echo "Sorting by name in reverse order:"
ls -lr
echo "--- Test: cat -n ---"
cat -n diff_a.txt
delay 700
echo "--- Test: cd into a file (should fail) ---"
echo "this is a file" > not_a_directory.txt
delay 300
check_fail "cd not_a_directory.txt"
delay 200
rm not_a_directory.txt
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 4: Testing Group Permissions & Ownership (Expanded) ====="
delay 400
login root mcgoopis
useradd testuser
testpass
testpass
delay 400
usermod -aG testgroup testuser
groups testuser
mkdir -p /tmp/no_exec_dir
chmod 644 /tmp/no_exec_dir
chmod 755 /home/diagUser
cd /home/diagUser/diag_workspace
delay 200
echo "Initial content" > group_test_file.txt
chown diagUser group_test_file.txt
chgrp testgroup group_test_file.txt
chmod 664 group_test_file.txt
echo "--- Test: Group write permission ---"
login testuser testpass
cd /home/diagUser/diag_workspace
delay 400
echo "Append by group member" >> group_test_file.txt
cat group_test_file.txt
echo "--- Test: 'Other' permissions (should fail) ---"
login Guest
cd /home/diagUser/diag_workspace
check_fail "echo 'Append by other user' >> group_test_file.txt"
delay 400
echo "--- Test: Permission Edge Cases ---"
login testuser testpass
check_fail "chmod 777 /home/diagUser/diag_workspace/group_test_file.txt"
check_fail "cd /tmp/no_exec_dir"
login root mcgoopis
delay 400
rm -r -f /tmp
removeuser -f testuser
groupdel testgroup
rm -f /home/diagUser/diag_workspace/group_test_file.txt
delay 400
chmod 700 /home/diagUser
login diagUser testpass
delay 400
cd /home/diagUser/diag_workspace
delay 500
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 4.5: Testing Recursive Ownership & Group Permissions ====="
delay 400

login root mcgoopis
echo "--- Setting up for recursive ownership tests ---"
groupadd recursive_test_group
useradd recursive_test_user
testpass
testpass
delay 400
mkdir -p /home/Guest/recursive_chown_test/subdir
echo "level 1 file" > /home/Guest/recursive_chown_test/file1.txt
echo "level 2 file" > /home/Guest/recursive_chown_test/subdir/file2.txt
echo "Initial state:"
ls -lR /home/Guest/recursive_chown_test
delay 500

echo "--- Test: Recursive chown (-R) ---"
chown -R recursive_test_user /home/Guest/recursive_chown_test
echo "State after recursive chown:"
ls -lR /home/Guest/recursive_chown_test
delay 500

echo "--- Test: Recursive chgrp (-R) ---"
chgrp -R recursive_test_group /home/Guest/recursive_chown_test
echo "State after recursive chgrp:"
ls -lR /home/Guest/recursive_chown_test
delay 500

echo "--- Cleanup from recursive tests ---"
removeuser -f recursive_test_user
groupdel recursive_test_group
rm -r -f /home/Guest/recursive_chown_test
login Guest
echo "Recursive ownership tests complete."
delay 500
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 5: Testing Sudo & Security Model ====="
delay 400
login root mcgoopis
useradd sudouser
testpass
testpass
delay 500
echo "sudouser ALL" >> /etc/sudoers
login sudouser testpass
echo "Attempting first sudo command (password required)..."
sudo echo "Sudo command successful."
testpass
delay 400
echo "Attempting second sudo command (should not require password)..."
sudo ls /home/root
login Guest
check_fail "sudo ls /home/root"
login root mcgoopis
removeuser -f sudouser
delay 400
grep -v "sudouser" /etc/sudoers > sudoers.tmp; mv sudoers.tmp /etc/sudoers
echo "--- Test: Granular sudo permissions ---"
useradd sudouser2
testpass
testpass
delay 500
echo "sudouser2 ls" >> /etc/sudoers
login sudouser2 testpass
echo "Attempting allowed specific command (ls)..."
sudo ls /home/root
testpass
delay 400
echo "Attempting disallowed specific command (rm)..."
check_fail "sudo rm -f /home/Guest/README.md"
login root mcgoopis
removeuser -f sudouser2
delay 400
grep -v "sudouser2" /etc/sudoers > sudoers.tmp; mv sudoers.tmp /etc/sudoers
login diagUser testpass
cd /home/diagUser/diag_workspace
echo "Granular sudo test complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 6: Testing Scripting & Process Management ====="
delay 400
echo "--- Test: Script argument passing ---"
run ./arg_test.sh first "second arg" third
echo "--- Test: Background jobs (ps, kill) ---"
delay 5000 &
ps
ps | grep delay | awk '{print $1}' | xargs kill
ps
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 7: Testing Data Processing & Text Utilities ======="
delay 400
echo "--- Test: sort (-n, -r, -u) ---"
sort -r sort_test.txt
sort -n sort_test.txt
sort -u sort_test.txt
delay 600
echo "--- Test: wc (-l, -w, -c) ---"
wc text_file.txt
wc -l -w -c text_file.txt
echo "--- Test: head/tail (-n, -c) ---"
head -n 1 text_file.txt
tail -c 5 text_file.txt
delay 500
echo "--- Test: grep flags (-i, -v, -c) ---"
grep -i "FOX" text_file.txt
grep -c "quick" text_file.txt
grep -v "cat" text_file.txt
echo "--- Test: xargs and pipe awareness ---"
ls -1 *.tmp | xargs rm
check_fail "ls file1.tmp"
echo "xargs deletion verified."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 8: Testing 'find' and Archival (zip/unzip) ====="
delay 400
echo "--- Test: find by name, type, and permissions ---"
find find_test -name "*.tmp"
find find_test -type d
find find_test -perm 777
delay 500
echo "--- Test: zip/unzip ---"
zip my_archive.zip ./zip_test
rm -r -f zip_test
unzip my_archive.zip .
ls -R zip_test
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 9: Testing Pager and Calculator Tests ====="
delay 400
echo "--- Test: bc command (pipe and argument) ---"
echo "5 * (10 - 2) / 4" | bc
bc "100 + 1"
check_fail "bc '5 / 0'"
delay 500
echo "--- Test: Pager integration (non-interactive pipe-through) ---"
echo -e "Line 1\nLine 2\nLine 3" > pager_test.txt
cat pager_test.txt | more | wc -l
cat pager_test.txt | less | wc -l
echo "Pager pass-through test complete."
echo "--- Test: Input Redirection (<) ---"
echo "hello redirect" > input_redir.txt
cat < input_redir.txt
delay 500
rm pager_test.txt input_redir.txt
echo "Input redirection test complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 10: Testing Data Transformation & Integrity Commands ====="
delay 400
echo "--- Test: rmdir ---"
mkdir empty_dir
rmdir empty_dir
check_fail "ls empty_dir"
mkdir non_empty_dir; touch non_empty_dir/file.txt
check_fail "rmdir non_empty_dir"
rm -r non_empty_dir
echo "rmdir tests complete."
delay 400
echo "--- Test: base64 (encode/decode) ---"
echo "The Tao is eternal." > b64_test.txt
base64 b64_test.txt > b64_encoded.txt
base64 -d b64_encoded.txt
rm b64_test.txt b64_encoded.txt
echo "base64 tests complete."
delay 400
echo "--- Test: xor (encrypt/decrypt) ---"
echo "Harmony and order." > xor_test.txt
xor diag_pass xor_test.txt > xor_encrypted.txt
xor diag_pass xor_encrypted.txt
rm xor_test.txt xor_encrypted.txt
echo "xor tests complete."
delay 400
echo "--- Test: ocrypt (secure encrypt/decrypt) ---"
echo "A truly secure message." > ocrypt_test.txt
ocrypt diag_secure_pass ocrypt_test.txt
ocrypt -d diag_secure_pass ocrypt_test.txt | grep "A truly secure message."
rm ocrypt_test.txt
echo "ocrypt secure tests complete."
delay 400
echo "--- Test: cksum and sync ---"
echo "A well-written program is its own Heaven." > cksum_test.txt
cksum cksum_test.txt
sync
delay 500
echo "A poorly-written program is its own Hell." >> cksum_test.txt
cksum cksum_test.txt
rm cksum_test.txt
echo "cksum and sync tests complete."
delay 400
# --- Test: csplit ---
echo -e "alpha\n" > csplit_test.txt
echo -e "bravo\n" >> csplit_test.txt
echo -e "charlie\n" >> csplit_test.txt
echo -e "delta\n" >> csplit_test.txt
echo -e "echo" >> csplit_test.txt
delay 500
csplit csplit_test.txt 3
ls xx*
rm -f xx00 xx01 csplit_test.txt
echo "csplit test complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 11: Testing Underrepresented Commands (Data/System) ====="
delay 400
echo "--- Test: uniq (-d, -u) ---"
sort uniq_test.txt | uniq -d
sort uniq_test.txt | uniq -u
echo "--- Test: awk scripting ---"
echo "Printing active users with values over 100 from csv"
awk -F, '/,active/ { print "User " $1 " is " $3 }' awk_test.csv
echo "--- Test: shuf (-i, -e) ---"
shuf -i 1-5 -n 3
shuf -e one two three four five
delay 500
echo "--- Test: tree (-L, -d) ---"
tree -L 2 ./recursive_test
tree -d ./recursive_test
echo "--- Test: du (recursive) and grep (-R) ---"
du recursive_test/
grep -R "secret" recursive_test/
echo "Underrepresented data command tests complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 12: Testing Shell & Session Commands ====="
delay 400
echo "--- Test: date ---"
date
echo "--- Test: df -h ---"
df -h
echo "--- Test: du -s ---"
du -s .
echo "--- Test: history -c ---"
history
history -c
history
delay 500
echo "--- Test: alias/unalias ---"
alias myls="ls -l"
myls
unalias myls
check_fail "myls"
echo "--- Test: set/unset ---"
set MY_VAR="Variable Test Passed"
echo $MY_VAR
unset MY_VAR
echo $MY_VAR
echo "--- Test: printscreen ---"
printscreen screen.txt
cat screen.txt
delay 200
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 13: Testing User & State Management ====="
delay 400
echo "--- Test: su and logout ---"
login root mcgoopis
useradd testuser2
newpass
newpass
su testuser2 newpass
whoami
logout
whoami
delay 500
echo "--- Test: savestate and loadstate ---"
login diagUser testpass
cd /home/diagUser/diag_workspace
savestate
echo "Modified State" > state_test.txt
loadstate
YES
cat state_test.txt
echo "User & State Management tests complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 14: Testing Network & System Documentation Commands ====="
delay 400
echo "--- Test: wget and curl ---"
wget -O wget.txt https://raw.githubusercontent.com/aedmark/Oopis-OS/refs/heads/master/docs/LICENSE.txt
cat wget.txt
rm wget.txt
curl https://raw.githubusercontent.com/aedmark/Oopis-OS/refs/heads/master/docs/LICENSE.txt > oopis_curl.txt
cat oopis_curl.txt
rm oopis_curl.txt
echo "--- Test: ping - Pinging a known-good host ---"
ping raw.githubusercontent.com
delay 700
echo "--- Test: ping - Pinging a non-existent host (should fail gracefully) ---"
check_fail "ping a-domain-that-does-not-exist-and-never-will.invalid"
delay 700
echo "'ping' command diagnostics finished."
echo "---------------------------------------------------------------------"
echo "--- Test: man and help ---"
man ls
help cp
echo "Network & Docs tests complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 15: Testing Edge Cases & Complex Scenarios (Expanded) ====="
delay 400

echo "--- Test: Filenames with spaces ---"
mkdir "my test dir"
echo "hello space" > "my test dir/file with spaces.txt"
ls "my test dir"
cat "my test dir/file with spaces.txt"
mv "my test dir" "your test dir"
ls "your test dir"
rm -r "your test dir"
delay 500
check_fail "ls 'my test dir'"
echo "Space filename tests complete."
delay 400

echo "--- Test: Advanced find commands (-exec, -delete, operators) ---"
mkdir -p find_exec_test/subdir
touch find_exec_test/file.exec
touch find_exec_test/subdir/another.exec
touch find_exec_test/file.noexec
# Test -exec to change permissions
find ./find_exec_test -name "*.exec" -exec chmod 777 {} \;
ls -l find_exec_test/
ls -l find_exec_test/subdir/
# Test -delete and -o (OR)
find ./find_exec_test -name "*.noexec" -o -name "another.exec" -delete
ls -R find_exec_test
rm -r find_exec_test
echo "Advanced find tests complete."
delay 400

echo "--- Test: Complex pipes and append redirection (>>) ---"
echo -e "apple\nbanana\norange\napple" > fruit.txt
cat fruit.txt | grep "a" | sort | uniq -c > fruit_report.txt
echo "--- Initial Report ---"
cat fruit_report.txt
echo "One more apple" >> fruit_report.txt
echo "--- Appended Report ---"
cat fruit_report.txt
rm fruit.txt fruit_report.txt
echo "Piping and redirection tests complete."
delay 400

echo "--- Test: Logical OR (||) and interactive flags ---"
check_fail "cat nonexistent_file.txt" || echo "Logical OR successful: cat failed as expected."
echo "YES" > yes.txt
echo "n" > no.txt
touch interactive_test.txt
rm -i interactive_test.txt < yes.txt
check_fail "ls interactive_test.txt"
touch another_file.txt
cp -i another_file.txt overwrite_dir < yes.txt
ls overwrite_dir
cp -f another_file.txt overwrite_dir
rm no.txt yes.txt another_file.txt
echo "Interactive flag and logical OR tests complete."
delay 700

echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 16: Testing Paranoid Security & Edge Cases ====="
delay 400
echo "--- Test: Advanced 'awk' with BEGIN/END blocks ---"
echo -e "10 alpha\n20 bravo\n30 charlie" > awk_data.txt
awk 'BEGIN { print "Report Start" } { print "Item " NR ":", $2 } END { print "Report End" }' awk_data.txt
rm awk_data.txt
delay 400
echo "--- Test: Scripting scope (ensure child script cannot modify parent shell) ---"
echo 'set CHILD_VAR="i am from the child"' > set_var.sh
chmod 700 ./set_var.sh
run ./set_var.sh
check_fail -z "echo $CHILD_VAR"
rm set_var.sh
echo "Scripting scope test complete."
delay 400
echo "--- Test: 'find' and 'xargs' with spaced filenames ---"
touch "a file with spaces.tmp"
find . -name "*.tmp" | xargs rm
check_fail "ls \"a file with spaces.tmp\""
echo "'find' and 'xargs' with spaces test complete."
delay 400
echo "--- Test: Input redirection and empty file creation ---"
> empty_via_redir.txt
echo "some data" > input.txt
cat < input.txt
rm empty_via_redir.txt input.txt
echo "Redirection tests complete."
echo "---------------------------------------------------------------------"
echo "===== Phase 17: Testing 'run' Command & Script Execution ====="
delay 400

echo "--- Test: Basic script execution ---"
# Create a simple script to be executed.
echo 'echo "Hello from a run script!"' > simple_test.sh
chmod 755 simple_test.sh
# Run it!
run ./simple_test.sh
rm simple_test.sh
echo "Basic execution test complete."
delay 400

echo "--- Test: Script argument passing ---"
# Create a script that prints its arguments.
echo '#!/bin/oopis_shell' > arg_passing_test.sh
echo 'echo "Arg 1: $1, Arg 2: $2, Arg Count: $#, All Args: $@" ' >> arg_passing_test.sh
chmod 755 arg_passing_test.sh
# Run the script with various arguments.
run ./arg_passing_test.sh first "second arg" third
rm arg_passing_test.sh
echo "Argument passing test complete."
delay 400

echo "--- Test: Script environment sandboxing ---"
# Create a script that sets a variable.
echo 'set CHILD_VAR="i am from the child"' > scope_test.sh
chmod 755 ./scope_test.sh
# Run the script.
run ./scope_test.sh
# Now, check if that variable leaked into our current shell. It shouldn't have!
# 'check_fail -z' will SUCCEED if the echo command produces NO output.
check_fail -z "echo $CHILD_VAR"
rm scope_test.sh
echo "Script sandboxing test complete."
delay 700

echo "---------------------------------------------------------------------"
echo "--- 'run' command diagnostics finished ---"
echo ""

echo ""
echo "===== Phase 18: Testing Symbolic Link Infrastructure ====="
delay 400

echo "--- Test: Symlink creation and display ---"
echo "This is the original target file." > original_target.txt
ln -s original_target.txt my_link
echo "Verifying link display with 'ls -l':"
ls -l my_link

echo "--- Test: Symlink content resolution via 'cat' ---"
cat my_link
delay 500

echo "--- Test: 'rm' behavior on symlinks vs. targets ---"
echo "Removing the link 'my_link'..."
rm my_link
echo "Verifying original file still exists:"
ls original_target.txt
delay 500
echo "Recreating link and removing the target..."
ln -s original_target.txt my_link
rm original_target.txt
echo "Verifying link is now dangling (ls should still show it):"
ls -l my_link
delay 500
check_fail "cat my_link"
echo "Dangling link test complete."
delay 500

echo "--- Test: Symlink infinite loop detection (CRUCIAL) ---"
ln -s link_b link_a
ln -s link_a link_b
echo "Attempting to cat a circular link (should fail gracefully)..."
check_fail "cat link_a"
echo "Loop detection test complete."
delay 500

echo "--- Finalizing symlink test cleanup ---"
rm link_a link_b my_link
check_fail "cat link_a"
check_fail "cat original_target.txt"
echo "Symbolic link tests complete."
echo "---------------------------------------------------------------------"
delay 400

echo ""
echo "===== Phase 19: Advanced Job Control & Signal Handling ====="
delay 400

echo "--- Test: Starting a long-running background job ---"
delay 30000 &
# Use ps and grep to get the job ID programmatically
JOB_ID=$(ps | grep "delay" | awk '{print $1}')
echo "Started background job with PID: $JOB_ID"
delay 500

echo "--- Test: Verifying job is 'Running' (R) ---"
# This check will now simply check if grep finds the running process. If not, the script will error out.
ps | grep "$JOB_ID" | grep 'R'
echo "Job status is correctly reported as 'R'."
delay 500

echo "--- Test: Pausing the job with 'kill -STOP' ---"
kill -STOP $JOB_ID
echo "Signal -STOP sent to job $JOB_ID."
delay 500

echo "--- Test: Verifying job is 'Stopped' (T) ---"
ps | grep "$JOB_ID" | grep 'T'
echo "Job status is correctly reported as 'T'."
delay 500

echo "--- Test: Resuming the job with 'kill -CONT' ---"
kill -CONT $JOB_ID
echo "Signal -CONT sent to job $JOB_ID."

echo "--- Test: Verifying job is 'Running' (R) again ---"
ps | grep "$JOB_ID" | grep 'R'
echo "Job status is correctly reported as 'R' after resuming."

echo "--- Test: Terminating the job with 'kill' ---"
kill -KILL $JOB_ID
echo "Signal -KILL sent to job $JOB_ID."
delay 1000 # Give it a moment to terminate

echo "--- Test: Verifying job has been terminated ---"
# This check will SUCCEED if grep finds nothing.
ps | grep '$JOB_ID'
echo "Job successfully terminated and removed from 'ps' list."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 20: Testing Stream & Text Manipulation Commands ====="
delay 400

echo "--- Test: nl (Number Lines) Command ---"
# Create a test file with blank lines
echo -e "First line.\n\nThird line." > nl_test.txt
echo "Testing nl on a file with blank lines:"
nl nl_test.txt
delay 400
echo "Testing nl on piped input:"
cat nl_test.txt | nl
rm nl_test.txt
echo "nl test complete."
delay 400

echo "--- Test: sed (Stream Editor) Command ---"
echo "Create a test file for substitution..."
delay 500
echo "The quick brown fox jumps over the lazy dog." > sed_test.txt
echo "The fox is a fox." >> sed_test.txt
echo "Original content:"
cat sed_test.txt
delay 400
echo "Testing single substitution:"
cat sed_test.txt | sed 's/fox/cat/'
delay 400
echo "Testing global substitution:"
cat sed_test.txt | sed 's/fox/cat/g'
rm sed_test.txt
echo "sed test complete."
delay 700
echo "Create a test file for cutting..."
delay 300
echo "first:second:third:fourth" > cut_test.txt
echo "apple,orange,banana,grape" >> cut_test.txt
echo "one;two;three;four" >> cut_test.txt
echo "--- Test: cut with colon delimiter ---"
cut -d: -f1,3 cut_test.txt
delay 400
echo "--- Test: cut with comma delimiter from pipe ---"
cat cut_test.txt | grep "apple" | cut -d, -f2,4
delay 400
echo "--- Test: cut with semicolon delimiter ---"
cut -d';' -f2,3,4 cut_test.txt
delay 400
echo "--- Test: check_fail on missing fields flag ---"
check_fail "cut -d, cut_test.txt"
delay 500
rm cut_test.txt
echo "'cut' command diagnostics finished."
delay 700
echo "---------------------------------------------------------------------"
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 21: Testing 'tr' Command Suite ====="
delay 400

echo "--- Test: tr - Basic translation (lower to upper) ---"
echo "hello world" | tr 'a-z' 'A-Z'
delay 400

echo "--- Test: tr - Character class translation ---"
echo "test 123" | tr '[:lower:]' '[:upper:]'
delay 400

echo "--- Test: tr -d (delete) with character class ---"
echo "abc-123-def" | tr -d '[:digit:]'
delay 400

echo "--- Test: tr -s (squeeze-repeats) ---"
echo "hellloooo     woooorld" | tr -s 'o'
delay 400

echo "--- Test: tr -c (complement) ---"
echo "123abc456" | tr -c '[:digit:]' '_'
delay 400

echo "--- Test: tr -cs (complement and squeeze) ---"
echo "###Hello... World!!!" | tr -cs '[:alnum:]' '_'
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase 22: Testing 'comm' Command Suite ====="
delay 400

echo "--- Test: comm - Creating sorted test files ---"
echo -e "apple\nbanana\ncommon\npear" > comm_a.txt
echo -e "banana\ncommon\norange\nstrawberry" > comm_b.txt
delay 400

echo "--- Test: comm - Default (three columns) ---"
comm comm_a.txt comm_b.txt
delay 400

echo "--- Test: comm - Suppress column 1 (-1) ---"
comm -1 comm_a.txt comm_b.txt
delay 400

echo "--- Test: comm - Suppress column 2 (-2) ---"
comm -2 comm_a.txt comm_b.txt
delay 400

echo "--- Test: comm - Suppress column 1 and 3 (-13) ---"
comm -13 comm_a.txt comm_b.txt
delay 400

echo "--- Test: comm - Suppress column 1 and 2 (-12) ---"
comm -12 comm_a.txt comm_b.txt
delay 400

echo "--- Cleaning up comm test files ---"
rm comm_a.txt comm_b.txt
echo "comm test complete."
delay 700
echo "---------------------------------------------------------------------"

echo "===== Phase X: Testing Filesystem Torture & I/O Gauntlet ====="
delay 400

echo "--- Test: Handling of obnoxious filenames ---"
mkdir -p "./a directory with spaces and.. special'chars!"
touch "./a directory with spaces and.. special'chars!/-leading_dash.txt"
echo "obnoxious" > "./a directory with spaces and.. special'chars!/test.txt"
delay 400
ls -l "./a directory with spaces and.. special'chars!"
cat "./a directory with spaces and.. special'chars!/test.txt"
rm -r -f "./a directory with spaces and.. special'chars!"
check_fail "ls './a directory with spaces and.. special'chars!'"
echo "Obnoxious filename tests complete."
delay 400

echo "--- Test: 'find' with complex -exec and permission checks ---"
mkdir -p find_torture/ro_subdir
echo "find me" > find_torture/file.txt
echo "don't find me" > find_torture/file.tmp
echo "cant touch this" > find_torture/ro_subdir/secret.txt
login root mcgoopis
chmod 500 /home/diagUser/diag_workspace/find_torture/ro_subdir
login diagUser testpass
cd /home/diagUser/diag_workspace
find ./find_torture -name "*.txt" -exec cat {} \;
check_fail "find ./find_torture -name '*.txt' -exec echo '{}' > ./find_torture/ro_subdir/output.log \;"
login root mcgoopis
rm -r -f /home/diagUser/diag_workspace/find_torture
login diagUser testpass
cd /home/diagUser/diag_workspace
echo "Complex find tests complete."
delay 700

echo "--- Test: Nested redirection and command substitution simulation ---"
echo "ls -l" > cmd.sh
chmod 700 cmd.sh
run ./cmd.sh > ls_output.txt
cat ls_output.txt | grep "cmd.sh" | wc -l
rm cmd.sh ls_output.txt
echo "Redirection simulation test complete."
delay 400
echo "---------------------------------------------------------------------"

login root mcgoopis

# Grant 'limitedsudo' the ability to run the 'cat' command, and nothing else.
delay 200
echo "--- Test: Hyper-specific sudo permissions ---"
delay 300
echo 'limitedsudo cat' >> /etc/sudoers
useradd limitedsudo
testpass
testpass
delay 400
chmod 701 /home/diagUser

echo "TOP SECRET" > /home/diagUser/diag_workspace/specific_file.txt

login limitedsudo testpass
cd /home/diagUser/diag_workspace
delay 400
echo "Attempting to run allowed command ('cat') on a file..."
sudo cat /home/diagUser/diag_workspace/specific_file.txt
testpass

echo "Attempting to run disallowed command ('ls')... (This should fail)"
check_fail "sudo ls /"
delay 400
login root mcgoopis
removeuser -f limitedsudo
grep -v "limitedsudo" /etc/sudoers > sudoers.tmp
mv sudoers.tmp /etc/sudoers
rm /home/diagUser/diag_workspace/specific_file.txt
login diagUser testpass

echo "Specific sudo tests complete."
delay 400
login root mcgoopis
removeuser -r -f limitedsudo
grep -v "limitedsudo" /etc/sudoers > sudoers.tmp; mv sudoers.tmp /etc/sudoers
delay 400

echo "--- Test: File ownership vs. permissions paradox ---"
useradd paradoxuser
testpass
testpass
delay 400
touch paradox.txt
chown paradoxuser paradox.txt
chmod 000 paradox.txt
login paradoxuser testpass
cd /home/diagUser/diag_workspace
check_fail "cat paradox.txt"
echo "Permission paradox test complete."
delay 400
login root mcgoopis
removeuser -r -f paradoxuser
rm paradox.txt
login diagUser testpass
cd /home/diagUser/diag_workspace
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase Z: Testing Process & State Integrity Under Stress ====="
delay 400

echo "--- Test: Background process race condition ---"
echo "one" > race.txt &
echo "two" > race.txt &
echo "three" > race.txt &
delay 500
echo "Race condition test initiated. Final content of race.txt:"
cat race.txt
rm race.txt
echo "Race condition test complete."
delay 400

echo "--- Test: State save/load integrity ---"
echo "pre-save" > state_integrity.txt
savestate
rm state_integrity.txt
mkdir -p new_dir_post_save
echo "post-save" > new_dir_post_save/another.txt
loadstate
YES
delay 400
ls state_integrity.txt
check_fail "ls new_dir_post_save"
rm state_integrity.txt
echo "State integrity tests complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase Alpha: Core Command & Flag Behavior ====="
delay 400

echo "--- Test: diff Command ---"
echo -e "line one\nline two\nline three" > diff_a.txt
echo -e "line one\nline 2\nline three" > diff_b.txt
diff diff_a.txt diff_b.txt
rm diff_a.txt diff_b.txt
echo "diff test complete."
delay 400

echo "--- Test: cp -p (Preserve Permissions) ---"
touch preserve_perms.txt
chmod 700 preserve_perms.txt
delay 400
cp -p preserve_perms.txt preserve_copy.sh
echo "Verifying preserved permissions:"
ls -l preserve_perms.txt preserve_copy.sh
rm preserve_perms.txt preserve_copy.sh
echo "cp -p test complete."
delay 400

echo "--- Test: touch with Time-Stamping ---"
touch -d "1 day ago" old_file.txt
touch -t 202305201200.30 specific_time.txt
echo "Verifying timestamps:"
ls -l old_file.txt specific_time.txt
rm old_file.txt specific_time.txt
echo "touch timestamp test complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase Beta: Group Permissions & Sudo ====="
delay 400

login root mcgoopis
echo "--- Test: Group Permissions ---"
groupadd testgroup
useradd testuser
testpass
testpass
delay 400
usermod -aG testgroup testuser
touch group_test_file.txt
chown diagUser group_test_file.txt
chgrp testgroup group_test_file.txt
chmod 664 group_test_file.txt
login testuser testpass
cd /home/diagUser/diag_workspace
echo "Appending to file as group member (should succeed)..."
echo "appended" >> group_test_file.txt
cat group_test_file.txt
login Guest
cd /home/diagUser/diag_workspace
echo "Appending to file as Guest (should fail)..."
check_fail "echo 'appended by guest' >> group_test_file.txt"
login root mcgoopis
delay 400
removeuser -f testuser
groupdel testgroup
rm group_test_file.txt
echo "Group permissions test complete."
delay 400

echo "--- Test: sudo with Granular Permissions ---"
useradd sudouser2
testpass
testpass
delay 400
echo "sudouser2 ALL=(ALL) /bin/ls" >> /etc/sudoers
login sudouser2 testpass
echo "Running allowed sudo command (sudo ls)..."
sudo ls /home/root
testpass
echo "Running disallowed sudo command (sudo rm)..."
check_fail "sudo rm -f /some/file"
login root mcgoopis
removeuser -f sudouser2
grep -v "sudouser2" /etc/sudoers > sudoers.tmp && mv sudoers.tmp /etc/sudoers
echo "Granular sudo test complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase Delta: Advanced Data & Process Management ====="
delay 400
login diagUser testpass
cd /home/diagUser/diag_workspace

echo "--- Test: sort Flags ---"
echo -e "10\n2\napple\nbanana\napple" > sort_test.txt
echo "Numeric sort:"
sort -n sort_test.txt
echo "Reverse sort:"
sort -r sort_test.txt
echo "Unique sort:"
sort -u sort_test.txt
delay 400
rm sort_test.txt
echo "sort test complete."
delay 400

echo "--- Test: find with -exec and -delete ---"
mkdir find_exec_test
delay 400
touch find_exec_test/test.exec
touch find_exec_test/test.noexec
echo "Changing permissions with find -exec..."
find ./find_exec_test -name "*.exec" -exec chmod 777 {} \;
ls -l find_exec_test
delay 400
echo "Deleting with find -delete..."
find ./find_exec_test -name "*.noexec" -delete
ls -l find_exec_test
rm -r find_exec_test
echo "find actions test complete."
delay 400

echo "--- Test: Pagers (more, less) Non-Interactive ---"
echo -e "line 1\nline 2\nline 3" > pager_test.txt
echo "Piping to 'more'..."
cat pager_test.txt | more | wc -l
echo "Piping to 'less'..."
cat pager_test.txt | less | wc -l
rm pager_test.txt
echo "Pager test complete."
delay 400

echo "--- Test: Input Redirection (<) ---"
echo "Redirected input" > input_redir.txt
cat < input_redir.txt
rm input_redir.txt
echo "Input redirection test complete."
delay 500
echo "---------------------------------------------------------------------"


echo ""
echo "===== Phase Theta: Filesystem Integrity & Edge Cases ====="
delay 400

echo "--- Test: rmdir on Non-Empty Directory ---"
mkdir non_empty_dir
touch non_empty_dir/file.txt
check_fail "rmdir non_empty_dir"
rm -r non_empty_dir
echo "rmdir on non-empty test complete."
delay 400

echo "--- Test: File I/O with Special Characters ---"
mkdir "a directory with spaces and.. special'chars!"
touch "a directory with spaces and.. special'chars!/-leading_dash.txt"
echo "Special content" > "a directory with spaces and.. special'chars!/-leading_dash.txt"
cat "a directory with spaces and.. special'chars!/-leading_dash.txt"
rm -r "a directory with spaces and.. special'chars!"
echo "Special characters test complete."
delay 400

echo "--- Test: xargs with Quoted Arguments ---"
touch "a file with spaces.tmp"
ls *.tmp | xargs -I {} mv {} {}.bak
ls *.bak
delay 200
rm *.bak
echo "xargs with quotes test complete."
delay 700
echo "---------------------------------------------------------------------"

echo ""
echo "===== Phase Gamma: Testing Diff and Patch Integration ====="
delay 400

echo "--- Test: Creating base files for diff and patch ---"
echo -e "The original first line.\nA second line, which will remain.\nThe third line is the charm." > original_document.txt
echo -e "The first line, now modified.\nA second line, which will remain.\nThe third line is the charm." > modified_document.txt
echo "Base files created."
delay 400

echo "--- Test: Generating a patch file with a custom utility ---"
# This simulates creating a patch object. A real 'diff' would output text,
# but for this test, we'll create the JSON patch our command expects.
echo '{"index":4,"delete":20,"insert":"first line, now modified.","deleted":"original first line."}' > changes.diff
echo "Patch file 'changes.diff' generated. Contents:"
cat changes.diff
delay 400

echo "--- Test: Applying the patch to the original file ---"
patch original_document.txt changes.diff
echo "Patch applied."
delay 400

echo "--- Test: Verifying the patched file (should show no differences) ---"
# We'll use 'check_fail -z' which SUCCEEDS if the command has ZERO output.
# A successful patch means 'diff' will find no differences and produce no output.
check_fail -z "diff original_document.txt modified_document.txt"
echo "Verification complete. If no failure was reported, the test was successful."
delay 400

echo "--- Cleaning up patch test files ---"
rm original_document.txt modified_document.txt changes.diff
echo "Patch integration test complete."
delay 700

echo ""
echo "--- Phase Omega: Final Cleanup ---"
cd /
login root mcgoopis
delay 300
removeuser -f diagUser
removeuser -f sudouser
removeuser -f testuser
removeuser -f testuser2
delay 400
rm -r -f /home/diagUser
rm -r -f /home/sudouser
rm -r -f /home/testuser
rm -r -f /home/testuser2
login Guest
listusers
delay 400
echo "---------------------------------------------------------------------"
echo ""
echo "      ===== OopisOS Core Test Suite v5 Complete ======="
echo " "
delay 500
echo "  ======================================================"
delay 150
echo "  ==                                                  =="
delay 150
echo "  ==           OopisOS Core Diagnostics               =="
delay 150
echo "  ==            ALL SYSTEMS OPERATIONAL               =="
delay 150
echo "  ==                                                  =="
delay 150
echo "  ======================================================"
echo " "
delay 500
echo "(As usual, you've been a real pantload!)"
beep
delay 650
echo " "
echo " "
delay 300
play E6 20n; play F6 32n; play F#6 32n; play G6 32n; play A6 64n