export function setRadioButtonState(activeValue) {
  const radioButtons = document.querySelectorAll('input[name="active"]');
  radioButtons.forEach((radio) => {
    radio.checked = radio.value === activeValue;
  });
}

export async function getViewMyScheduleData(req) {
  const event = await Event.findById(req.params.id);
  const userId = req.session.user.userId;
  if (!event) throw new Error("Event not found");
  return {
    title: "My Schedule",
    event: event,
    userId: userId,
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  };
}

export async function getEditEventData(req) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new Error("Event not found");
  return {
    title: "Edit Event",
    event: event,
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  };
}
