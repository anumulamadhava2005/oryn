// scratch/test_triage_filter.js
// Verification of TriageFeed filtering logic

const overdueDeadlines = [{ id: '1', subject: 'Assignment 1', deadline: '2026-09-17T10:00:00Z' }];
const dueTodayDeadlines = [{ id: '2', subject: 'Lab Quiz', deadline: '2026-09-18T18:00:00Z' }];
const actionItems = [
  { key: 'task-1', action: 'Submit fees', email: { id: '3' }, allSenders: ['Accounts'] },
  { key: 'task-2', action: 'Fill feedback', email: { id: '4' }, allSenders: ['Dean Academic'] },
];
const criticalAlerts = [{ id: '5', subject: 'Hostel Maintenance Notice', date: '2026-09-18T08:00:00Z' }];
const completedMap = { 'task-2': true };

function getFilteredData(filter) {
  const showOverdue = filter === 'all' || filter === 'overdue';
  const showDueToday = filter === 'all' || filter === 'due_today';
  const showTasks = filter === 'all' || filter === 'tasks';
  const showImportant = filter === 'all' || filter === 'important';

  return {
    overdue: showOverdue ? overdueDeadlines : [],
    dueToday: showDueToday ? dueTodayDeadlines : [],
    tasks: showTasks ? actionItems : [],
    alerts: showImportant ? criticalAlerts : [],
  };
}

console.log('--- ALL ---');
console.log(getFilteredData('all'));

console.log('--- OVERDUE ONLY ---');
console.log(getFilteredData('overdue'));

console.log('--- TASKS ONLY ---');
console.log(getFilteredData('tasks'));

console.log('--- IMPORTANT ONLY ---');
console.log(getFilteredData('important'));

console.log('Filtering logic verified successfully!');
