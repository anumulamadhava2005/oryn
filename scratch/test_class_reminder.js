// scratch/test_class_reminder.js
function parseClassStartTime(timeSlot) {
  const parts = timeSlot.split('-').map(p => p.trim());
  if (parts.length < 2) return null;

  const startPart = parts[0];
  const endPart = parts[1];

  const isPM = /PM/i.test(endPart) || /PM/i.test(startPart);
  const isAM = /AM/i.test(endPart) || /AM/i.test(startPart);

  const startMatch = startPart.match(/(\d+):(\d+)/);
  if (!startMatch) return null;

  let hour = parseInt(startMatch[1], 10);
  const minute = parseInt(startMatch[2], 10);

  if (isPM && hour < 12) {
    hour += 12;
  } else if (isAM && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

const testSlots = [
  '8:00 - 8:50 AM',
  '9:00 - 9:50 AM',
  '10:00 - 10:50 AM',
  '11:00 - 11:50 AM',
  '12:00 - 12:50 PM',
  '1:00 - 1:50 PM',
  '2:00 - 2:50 PM',
  '3:00 - 3:50 PM',
  '4:00 - 4:50 PM',
  '5:00 - 5:50 PM',
  '6:15 - 7:00 PM',
];

for (const s of testSlots) {
  const res = parseClassStartTime(s);
  const reminderHour = Math.floor((res.hour * 60 + res.minute - 15) / 60);
  const reminderMin = (res.hour * 60 + res.minute - 15) % 60;
  console.log(`${s} -> Class at ${res.hour}:${res.minute.toString().padStart(2, '0')} | Reminder at ${reminderHour}:${reminderMin.toString().padStart(2, '0')}`);
}
