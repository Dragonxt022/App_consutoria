function resolveCourseStatus(course, now = new Date()) {
  const isActive = course?.active !== false;
  const startDate = course?.startDate ? new Date(course.startDate) : null;
  const isExpired = Boolean(startDate && !Number.isNaN(startDate.getTime()) && startDate < now);
  const manualStatus = String(course?.status || 'ativo').trim().toLowerCase();

  if (!isActive) {
    return {
      code: 'desativado',
      label: 'Desativado',
      isExpired
    };
  }

  if (isExpired) {
    return {
      code: 'encerrado',
      label: 'Encerrado',
      isExpired: true
    };
  }

  if (manualStatus === 'confirmado') {
    return {
      code: 'confirmado',
      label: 'Confirmado',
      isExpired: false
    };
  }

  return {
    code: 'ativo',
    label: 'Ativo',
    isExpired: false
  };
}

module.exports = {
  resolveCourseStatus
};
