/**
 * Helper translations for Bangla Front ID Badge
 */

export const getBanglaDepartment = (department: string): string => {
  if (department.includes('Engineering') || department.includes('Technology')) {
    return 'প্রকৌশল ও প্রযুক্তি বিভাগ';
  }
  if (department.includes('Human Resources') || department.includes('Talent')) {
    return 'মানবসম্পদ ও নিয়োগ বিভাগ';
  }
  if (department.includes('Finance') || department.includes('Treasury')) {
    return 'অর্থ ও তহবিল ব্যবস্থাপনা বিভাগ';
  }
  if (department.includes('Operations') || department.includes('Projects')) {
    return 'অপারেশনস ও প্রকল্প বিভাগ';
  }
  if (department.includes('Legal') || department.includes('Compliance')) {
    return 'আইন ও নিয়ন্ত্রক সম্মতি বিভাগ';
  }
  return 'কর্পোরেট প্রশাসন বিভাগ';
};

export const getBanglaDesignation = (designation: string): string => {
  if (designation.includes('Architect')) {
    return 'প্রধান সফটওয়্যার আর্কিটেক্ট';
  }
  if (designation.includes('DevOps') || designation.includes('Cloud')) {
    return 'ক্লাউড ও ডেভঅপ্স প্রকৌশলী';
  }
  if (designation.includes('Director')) {
    return 'পরিচালক, মানবসম্পদ ও সম্মতি';
  }
  if (designation.includes('Financial') || designation.includes('Controller')) {
    return 'সিনিয়র ফিনান্সিয়াল কন্ট্রোলার';
  }
  if (designation.includes('Delivery') || designation.includes('Head')) {
    return 'প্রধান, ক্লায়েন্ট ডেলিভারি';
  }
  if (designation.includes('Legal') || designation.includes('Counsel')) {
    return 'সিনিয়র লিগ্যাল কাউন্সেল';
  }
  if (designation.includes('Consultant')) {
    return 'সলিউশন কনসালট্যান্ট';
  }
  if (designation.includes('Talent') || designation.includes('Partner')) {
    return 'ট্যালেন্ট অ্যাকুইজিশন স্পেশালিস্ট';
  }
  if (designation.includes('Treasury') || designation.includes('Analyst')) {
    return 'ট্রেজারি ও পে-রোল অ্যানালিস্ট';
  }
  if (designation.includes('Operations') || designation.includes('Logistics')) {
    return 'সিনিয়র অপারেশনস সমন্বয়কারী';
  }
  if (designation.includes('Compliance')) {
    return 'নিয়ন্ত্রক সম্মতি বিশেষজ্ঞ';
  }
  return 'কর্মকর্তা ও পেশাদার';
};

export const getBanglaName = (fullName: string): string => {
  const nameMap: Record<string, string> = {
    'Mohammed Al-Otaibi': 'মুহাম্মদ আল-ওতাইবি',
    'Fatima Al-Zahrani': 'ফাতিমা আল-জাহরানি',
    'Tariq Mahmoud': 'তারিক মাহমুদ',
    'Abdul Rahman': 'আব্দুর রহমান',
    'Sarah Jenkins': 'সারাহ জেনকিন্স',
    'Rajesh Kumar': 'রাজেশ কুমার',
    'Wei Zhang': 'ওয়েই ঝাং',
    'Ahmed Al-Ghamdi': 'আহমেদ আল-গামদি',
    'Noura Al-Shehri': 'নওরা আল-শেহরি',
    'Omar Farooq': 'ওমর ফারুক',
    'John Doe': 'জন ডো',
    'Jane Doe': 'জেন ডো',
  };

  if (nameMap[fullName]) {
    return nameMap[fullName];
  }

  // Common title/prefix transliterations
  let bangla = fullName
    .replace(/\bMohammed\b/gi, 'মুহাম্মদ')
    .replace(/\bMohammad\b/gi, 'মুহাম্মদ')
    .replace(/\bAhmed\b/gi, 'আহমেদ')
    .replace(/\bAli\b/gi, 'আলী')
    .replace(/\bOmar\b/gi, 'ওমর')
    .replace(/\bHassan\b/gi, 'হাসান')
    .replace(/\bFatima\b/gi, 'ফাতিমা')
    .replace(/\bSarah\b/gi, 'সারাহ')
    .replace(/\bAbdullah\b/gi, 'আব্দুল্লাহ')
    .replace(/\bAbdul\b/gi, 'আব্দুল');

  return bangla;
};

export const BANGLA_BADGE_LABELS = {
  companyName: 'নেক্সাস গ্লোবাল কর্পোরেশন',
  credentialTitle: 'নিরাপত্তা পরিচয়পত্র',
  badgeSize: 'সাইজ: ২.৫" × ৩" (Size: 2.5" × 3")',
  idLabel: 'আইডি নং',
  nationality: 'জাতীয়তা',
  iqamaId: 'ইকামা / এনআইডি',
  joined: 'যোগদান',
  crNumber: 'সিআর নং',
  scanToVerify: 'যাচাই করতে স্ক্যান করুন',
  authCode: 'নিরাপত্তা কোড',
  authorizedOnly: 'নেক্সাস গ্লোবাল · অনুমোদিত ব্যবহারের জন্য · ২.৫" × ৩"',
};
