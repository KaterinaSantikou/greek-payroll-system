/**
 * Real-time ERGANI Validation - Check before submitting
 * Comprehensive validation system for Greek employment data compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Send,
  Eye,
  FileText,
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Shield,
  Zap,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  AlertCircle,
  Info,
  CheckCheck,
  X,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Activity,
  BarChart3,
  TrendingUp,
  Target,
  Flag,
} from 'lucide-react';

interface ValidationResult {
  field: string;
  fieldEl: string;
  status: 'valid' | 'invalid' | 'warning';
  message: string;
  messageEl: string;
  code?: string;
  suggestion?: string;
  suggestionEl?: string;
}

interface ERGANIEmployee {
  id: string;
  firstName: string;
  lastName: string;
  afm: string;
  amka: string;
  birthDate: string;
  nationality: string;
  gender: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
}

interface ERGANIContract {
  id: string;
  employeeId: string;
  contractType: string;
  startDate: string;
  endDate?: string;
  workingHours: number;
  salary: number;
  position: string;
  department: string;
  specialtyCode: string;
  insertionReason: string;
  workLocation: string;
  collectiveAgreement?: string;
}

interface ERGANIWorkCard {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  workType: string;
  location: string;
  overtime: boolean;
  holidayWork: boolean;
  nightShift: boolean;
}

interface ValidationSummary {
  totalChecks: number;
  validChecks: number;
  invalidChecks: number;
  warningChecks: number;
  overallScore: number;
  readyToSubmit: boolean;
}

interface ERGANIValidationProps {
  locale?: 'en' | 'el';
}

const SAMPLE_EMPLOYEES: ERGANIEmployee[] = [
  {
    id: 'emp-001',
    firstName: 'Dimitris',
    lastName: 'Papadopoulos',
    afm: '123456789',
    amka: '12345678901',
    birthDate: '1985-03-15',
    nationality: 'GR',
    gender: 'M',
    address: 'Voukourestiou 25',
    city: 'Athens',
    postalCode: '10671',
    phone: '+30 210 123 4567',
    email: 'dimitris.p@company.gr',
    emergencyContact: 'Maria Papadopoulos',
    emergencyPhone: '+30 210 987 6543',
  },
  {
    id: 'emp-002',
    firstName: 'Sofia',
    lastName: 'Nikolaou',
    afm: '987654321',
    amka: '98765432109',
    birthDate: '1990-07-22',
    nationality: 'GR',
    gender: 'F',
    address: 'Ermou 45',
    city: 'Thessaloniki',
    postalCode: '54624',
    phone: '+30 231 098 7654',
    email: 'sofia.n@company.gr',
    emergencyContact: 'Yannis Nikolaou',
    emergencyPhone: '+30 231 555 1234',
  },
];

const SAMPLE_CONTRACTS: ERGANIContract[] = [
  {
    id: 'cont-001',
    employeeId: 'emp-001',
    contractType: 'INDEFINITE',
    startDate: '2024-01-15',
    workingHours: 40,
    salary: 1200,
    position: 'Software Developer',
    department: 'IT',
    specialtyCode: '2512',
    insertionReason: 'NEW_HIRE',
    workLocation: 'Athens Office',
    collectiveAgreement: 'IT_SECTOR_2024',
  },
  {
    id: 'cont-002',
    employeeId: 'emp-002',
    contractType: 'FIXED_TERM',
    startDate: '2024-02-01',
    endDate: '2024-12-31',
    workingHours: 35,
    salary: 1000,
    position: 'Marketing Specialist',
    department: 'Marketing',
    specialtyCode: '2431',
    insertionReason: 'SEASONAL',
    workLocation: 'Thessaloniki Office',
  },
];

const SAMPLE_WORK_CARDS: ERGANIWorkCard[] = [
  {
    id: 'wc-001',
    employeeId: 'emp-001',
    date: '2025-01-20',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    workType: 'REGULAR',
    location: 'Athens Office',
    overtime: false,
    holidayWork: false,
    nightShift: false,
  },
];

export default function ERGANIValidation({
  locale = 'en',
}: ERGANIValidationProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [employees, setEmployees] = useState(SAMPLE_EMPLOYEES);
  const [contracts, setContracts] = useState(SAMPLE_CONTRACTS);
  const [workCards, setWorkCards] = useState(SAMPLE_WORK_CARDS);
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary>(
    {
      totalChecks: 0,
      validChecks: 0,
      invalidChecks: 0,
      warningChecks: 0,
      overallScore: 0,
      readyToSubmit: false,
    }
  );
  const [isValidating, setIsValidating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<ERGANIEmployee | null>(null);
  const [autoValidate, setAutoValidate] = useState(true);

  const translations = {
    en: {
      title: 'ERGANI Validation',
      subtitle: 'Real-time validation before submitting to ERGANI II',
      tabs: {
        dashboard: 'Dashboard',
        employees: 'Employees',
        contracts: 'Contracts',
        workCards: 'Work Cards',
        validation: 'Validation Results',
        settings: 'Settings',
      },
      validation: {
        valid: 'Valid',
        invalid: 'Invalid',
        warning: 'Warning',
        pending: 'Pending',
        validating: 'Validating...',
        completed: 'Validation Completed',
        readyToSubmit: 'Ready to Submit',
        notReady: 'Not Ready - Fix Errors',
        overallScore: 'Overall Validation Score',
        totalChecks: 'Total Checks',
        validChecks: 'Valid',
        invalidChecks: 'Invalid',
        warningChecks: 'Warnings',
      },
      actions: {
        validate: 'Validate All',
        submit: 'Submit to ERGANI',
        refresh: 'Refresh',
        export: 'Export Report',
        fix: 'Fix Issue',
        ignore: 'Ignore Warning',
        details: 'View Details',
        edit: 'Edit',
        delete: 'Delete',
        add: 'Add New',
      },
      fields: {
        firstName: 'First Name',
        lastName: 'Last Name',
        afm: 'AFM (Tax Number)',
        amka: 'AMKA (Social Security)',
        birthDate: 'Birth Date',
        nationality: 'Nationality',
        gender: 'Gender',
        address: 'Address',
        city: 'City',
        postalCode: 'Postal Code',
        phone: 'Phone',
        email: 'Email',
        contractType: 'Contract Type',
        startDate: 'Start Date',
        endDate: 'End Date',
        workingHours: 'Working Hours',
        salary: 'Salary',
        position: 'Position',
        department: 'Department',
        workLocation: 'Work Location',
      },
      validationRules: {
        title: 'ERGANI Validation Rules',
        afmFormat: 'AFM must be 9 digits',
        amkaFormat: 'AMKA must be 11 digits',
        emailFormat: 'Valid email address required',
        phoneFormat: 'Valid Greek phone number required',
        dateFormat: 'Date must be in DD/MM/YYYY format',
        salaryMinimum: 'Salary cannot be below minimum wage',
        workingHoursMax: 'Working hours cannot exceed 48 per week',
        contractDates: 'Contract end date must be after start date',
        specialtyCode: 'Valid specialty code required',
      },
      errors: {
        invalidAFM: 'Invalid AFM format or checksum',
        invalidAMKA: 'Invalid AMKA format or checksum',
        invalidEmail: 'Invalid email address format',
        invalidPhone: 'Invalid Greek phone number format',
        invalidDate: 'Invalid date format',
        salaryTooLow: 'Salary below minimum wage (€760)',
        workingHoursTooHigh: 'Working hours exceed legal limit (48h/week)',
        missingField: 'Required field is missing',
        invalidContractDates: 'Contract end date before start date',
        duplicateAFM: 'AFM already exists in system',
        duplicateAMKA: 'AMKA already exists in system',
      },
      warnings: {
        unusualSalary: 'Salary seems unusually high/low',
        weekendWork: 'Work scheduled on weekend',
        nightShift: 'Night shift work requires special approval',
        overtime: 'Overtime work detected',
        holidayWork: 'Work on public holiday',
        contractExpiring: 'Contract expiring within 30 days',
      },
    },
    el: {
      title: 'Επικύρωση ΕΡΓΑΝΗ',
      subtitle: 'Επικύρωση σε πραγματικό χρόνο πριν την υποβολή στην ΕΡΓΑΝΗ ΙΙ',
      tabs: {
        dashboard: 'Ταμπλό',
        employees: 'Εργαζόμενοι',
        contracts: 'Συμβόλαια',
        workCards: 'Κάρτες Εργασίας',
        validation: 'Αποτελέσματα Επικύρωσης',
        settings: 'Ρυθμίσεις',
      },
      validation: {
        valid: 'Έγκυρο',
        invalid: 'Μη Έγκυρο',
        warning: 'Προειδοποίηση',
        pending: 'Εκκρεμεί',
        validating: 'Επικυρώνει...',
        completed: 'Επικύρωση Ολοκληρώθηκε',
        readyToSubmit: 'Έτοιμο για Υποβολή',
        notReady: 'Μη Έτοιμο - Διορθώστε Σφάλματα',
        overallScore: 'Συνολικός Βαθμός Επικύρωσης',
        totalChecks: 'Σύνολο Ελέγχων',
        validChecks: 'Έγκυρα',
        invalidChecks: 'Μη Έγκυρα',
        warningChecks: 'Προειδοποιήσεις',
      },
      actions: {
        validate: 'Επικύρωση Όλων',
        submit: 'Υποβολή στην ΕΡΓΑΝΗ',
        refresh: 'Ανανέωση',
        export: 'Εξαγωγή Αναφοράς',
        fix: 'Διόρθωση Προβλήματος',
        ignore: 'Αγνόηση Προειδοποίησης',
        details: 'Προβολή Λεπτομερειών',
        edit: 'Επεξεργασία',
        delete: 'Διαγραφή',
        add: 'Προσθήκη Νέου',
      },
      fields: {
        firstName: 'Όνομα',
        lastName: 'Επώνυμο',
        afm: 'ΑΦΜ',
        amka: 'ΑΜΚΑ',
        birthDate: 'Ημερομηνία Γέννησης',
        nationality: 'Εθνικότητα',
        gender: 'Φύλο',
        address: 'Διεύθυνση',
        city: 'Πόλη',
        postalCode: 'Ταχυδρομικός Κώδικας',
        phone: 'Τηλέφωνο',
        email: 'Email',
        contractType: 'Τύπος Συμβολαίου',
        startDate: 'Ημερομηνία Έναρξης',
        endDate: 'Ημερομηνία Λήξης',
        workingHours: 'Ώρες Εργασίας',
        salary: 'Μισθός',
        position: 'Θέση',
        department: 'Τμήμα',
        workLocation: 'Τόπος Εργασίας',
      },
      validationRules: {
        title: 'Κανόνες Επικύρωσης ΕΡΓΑΝΗ',
        afmFormat: 'Το ΑΦΜ πρέπει να είναι 9 ψηφία',
        amkaFormat: 'Το ΑΜΚΑ πρέπει να είναι 11 ψηφία',
        emailFormat: 'Απαιτείται έγκυρη διεύθυνση email',
        phoneFormat: 'Απαιτείται έγκυρος ελληνικός αριθμός τηλεφώνου',
        dateFormat: 'Η ημερομηνία πρέπει να είναι σε μορφή ΗΗ/ΜΜ/ΕΕΕΕ',
        salaryMinimum: 'Ο μισθός δεν μπορεί να είναι κάτω από τον κατώτατο',
        workingHoursMax:
          'Οι ώρες εργασίας δεν μπορούν να υπερβαίνουν τις 48 την εβδομάδα',
        contractDates:
          'Η ημερομηνία λήξης συμβολαίου πρέπει να είναι μετά την έναρξη',
        specialtyCode: 'Απαιτείται έγκυρος κωδικός ειδικότητας',
      },
      errors: {
        invalidAFM: 'Μη έγκυρη μορφή ή άθροισμα ελέγχου ΑΦΜ',
        invalidAMKA: 'Μη έγκυρη μορφή ή άθροισμα ελέγχου ΑΜΚΑ',
        invalidEmail: 'Μη έγκυρη μορφή διεύθυνσης email',
        invalidPhone: 'Μη έγκυρη μορφή ελληνικού τηλεφώνου',
        invalidDate: 'Μη έγκυρη μορφή ημερομηνίας',
        salaryTooLow: 'Μισθός κάτω από τον κατώτατο (€760)',
        workingHoursTooHigh:
          'Ώρες εργασίας υπερβαίνουν το νόμιμο όριο (48ω/εβδομάδα)',
        missingField: 'Το υποχρεωτικό πεδίο λείπει',
        invalidContractDates: 'Ημερομηνία λήξης συμβολαίου πριν την έναρξη',
        duplicateAFM: 'Το ΑΦΜ υπάρχει ήδη στο σύστημα',
        duplicateAMKA: 'Το ΑΜΚΑ υπάρχει ήδη στο σύστημα',
      },
      warnings: {
        unusualSalary: 'Ο μισθός φαίνεται ασυνήθιστα υψηλός/χαμηλός',
        weekendWork: 'Εργασία προγραμματισμένη για Σαββατοκύριακο',
        nightShift: 'Η νυχτερινή εργασία απαιτεί ειδική άδεια',
        overtime: 'Εντοπίστηκε υπερωριακή εργασία',
        holidayWork: 'Εργασία σε δημόσια αργία',
        contractExpiring: 'Το συμβόλαιο λήγει εντός 30 ημερών',
      },
    },
  };

  const t = translations[locale];

  // AFM validation with checksum
  const validateAFM = useCallback((afm: string): boolean => {
    if (!/^\d{9}$/.test(afm)) return false;

    const digits = afm.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += digits[i] * Math.pow(2, 8 - i);
    }
    const checksum = sum % 11;
    const expectedChecksum = checksum < 10 ? checksum : 0;

    return digits[8] === expectedChecksum;
  }, []);

  // AMKA validation with checksum
  const validateAMKA = useCallback((amka: string): boolean => {
    if (!/^\d{11}$/.test(amka)) return false;

    const digits = amka.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 2);
      if (digits[i] * (i % 2 === 0 ? 1 : 2) > 9) {
        sum -= 9;
      }
    }
    const checksum = (10 - (sum % 10)) % 10;

    return digits[10] === checksum;
  }, []);

  // Email validation
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Greek phone validation
  const validateGreekPhone = useCallback((phone: string): boolean => {
    const phoneRegex = /^(\+30|0030|30)?[ -]?([2-9]\d{8}|69\d{8})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }, []);

  // Comprehensive validation function
  const validateEmployeeData = useCallback(
    (employee: ERGANIEmployee): ValidationResult[] => {
      const results: ValidationResult[] = [];

      // AFM validation
      if (!validateAFM(employee.afm)) {
        results.push({
          field: 'afm',
          fieldEl: 'ΑΦΜ',
          status: 'invalid',
          message: t.errors.invalidAFM,
          messageEl: 'Μη έγκυρη μορφή ή άθροισμα ελέγχου ΑΦΜ',
          code: 'AFM_INVALID',
          suggestion: 'Please verify the AFM number and checksum',
          suggestionEl:
            'Παρακαλώ επιβεβαιώστε τον αριθμό και το άθροισμα ελέγχου του ΑΦΜ',
        });
      } else {
        results.push({
          field: 'afm',
          fieldEl: 'ΑΦΜ',
          status: 'valid',
          message: 'AFM is valid',
          messageEl: 'Το ΑΦΜ είναι έγκυρο',
        });
      }

      // AMKA validation
      if (!validateAMKA(employee.amka)) {
        results.push({
          field: 'amka',
          fieldEl: 'ΑΜΚΑ',
          status: 'invalid',
          message: t.errors.invalidAMKA,
          messageEl: 'Μη έγκυρη μορφή ή άθροισμα ελέγχου ΑΜΚΑ',
          code: 'AMKA_INVALID',
          suggestion: 'Please verify the AMKA number and checksum',
          suggestionEl:
            'Παρακαλώ επιβεβαιώστε τον αριθμό και το άθροισμα ελέγχου του ΑΜΚΑ',
        });
      } else {
        results.push({
          field: 'amka',
          fieldEl: 'ΑΜΚΑ',
          status: 'valid',
          message: 'AMKA is valid',
          messageEl: 'Το ΑΜΚΑ είναι έγκυρο',
        });
      }

      // Email validation
      if (!validateEmail(employee.email)) {
        results.push({
          field: 'email',
          fieldEl: 'Email',
          status: 'invalid',
          message: t.errors.invalidEmail,
          messageEl: 'Μη έγκυρη μορφή διεύθυνσης email',
          code: 'EMAIL_INVALID',
          suggestion: 'Please enter a valid email address',
          suggestionEl: 'Παρακαλώ εισάγετε έγκυρη διεύθυνση email',
        });
      } else {
        results.push({
          field: 'email',
          fieldEl: 'Email',
          status: 'valid',
          message: 'Email is valid',
          messageEl: 'Το email είναι έγκυρο',
        });
      }

      // Phone validation
      if (!validateGreekPhone(employee.phone)) {
        results.push({
          field: 'phone',
          fieldEl: 'Τηλέφωνο',
          status: 'invalid',
          message: t.errors.invalidPhone,
          messageEl: 'Μη έγκυρη μορφή ελληνικού τηλεφώνου',
          code: 'PHONE_INVALID',
          suggestion: 'Please enter a valid Greek phone number',
          suggestionEl: 'Παρακαλώ εισάγετε έγκυρο ελληνικό αριθμό τηλεφώνου',
        });
      } else {
        results.push({
          field: 'phone',
          fieldEl: 'Τηλέφωνο',
          status: 'valid',
          message: 'Phone number is valid',
          messageEl: 'Ο αριθμός τηλεφώνου είναι έγκυρος',
        });
      }

      // Required fields check
      const requiredFields = [
        'firstName',
        'lastName',
        'birthDate',
        'nationality',
        'gender',
        'address',
        'city',
        'postalCode',
      ];
      requiredFields.forEach(field => {
        const value = employee[field as keyof ERGANIEmployee];
        if (!value || value.toString().trim() === '') {
          results.push({
            field,
            fieldEl: t.fields[field as keyof typeof t.fields],
            status: 'invalid',
            message: t.errors.missingField,
            messageEl: 'Το υποχρεωτικό πεδίο λείπει',
            code: 'MISSING_FIELD',
            suggestion: `Please provide ${t.fields[field as keyof typeof t.fields]}`,
            suggestionEl: `Παρακαλώ συμπληρώστε το πεδίο ${t.fields[field as keyof typeof t.fields]}`,
          });
        } else {
          results.push({
            field,
            fieldEl: t.fields[field as keyof typeof t.fields],
            status: 'valid',
            message: `${t.fields[field as keyof typeof t.fields]} is provided`,
            messageEl: `Το πεδίο ${t.fields[field as keyof typeof t.fields]} είναι συμπληρωμένο`,
          });
        }
      });

      return results;
    },
    [validateAFM, validateAMKA, validateEmail, validateGreekPhone, t]
  );

  // Contract validation
  const validateContractData = useCallback(
    (contract: ERGANIContract): ValidationResult[] => {
      const results: ValidationResult[] = [];

      // Salary validation
      const minimumWage = 760;
      if (contract.salary < minimumWage) {
        results.push({
          field: 'salary',
          fieldEl: 'Μισθός',
          status: 'invalid',
          message: t.errors.salaryTooLow,
          messageEl: `Μισθός κάτω από τον κατώτατο (€${minimumWage})`,
          code: 'SALARY_TOO_LOW',
          suggestion: `Salary must be at least €${minimumWage}`,
          suggestionEl: `Ο μισθός πρέπει να είναι τουλάχιστον €${minimumWage}`,
        });
      } else {
        results.push({
          field: 'salary',
          fieldEl: 'Μισθός',
          status: 'valid',
          message: 'Salary meets minimum wage requirements',
          messageEl: 'Ο μισθός πληροί τις απαιτήσεις κατώτατου μισθού',
        });
      }

      // Working hours validation
      if (contract.workingHours > 48) {
        results.push({
          field: 'workingHours',
          fieldEl: 'Ώρες Εργασίας',
          status: 'invalid',
          message: t.errors.workingHoursTooHigh,
          messageEl: 'Ώρες εργασίας υπερβαίνουν το νόμιμο όριο (48ω/εβδομάδα)',
          code: 'WORKING_HOURS_TOO_HIGH',
          suggestion: 'Working hours cannot exceed 48 per week',
          suggestionEl:
            'Οι ώρες εργασίας δεν μπορούν να υπερβαίνουν τις 48 την εβδομάδα',
        });
      } else {
        results.push({
          field: 'workingHours',
          fieldEl: 'Ώρες Εργασίας',
          status: 'valid',
          message: 'Working hours are within legal limits',
          messageEl: 'Οι ώρες εργασίας είναι εντός των νόμιμων ορίων',
        });
      }

      // Contract dates validation
      if (
        contract.endDate &&
        new Date(contract.endDate) <= new Date(contract.startDate)
      ) {
        results.push({
          field: 'contractDates',
          fieldEl: 'Ημερομηνίες Συμβολαίου',
          status: 'invalid',
          message: t.errors.invalidContractDates,
          messageEl: 'Ημερομηνία λήξης συμβολαίου πριν την έναρξη',
          code: 'INVALID_CONTRACT_DATES',
          suggestion: 'End date must be after start date',
          suggestionEl: 'Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη',
        });
      } else {
        results.push({
          field: 'contractDates',
          fieldEl: 'Ημερομηνίες Συμβολαίου',
          status: 'valid',
          message: 'Contract dates are valid',
          messageEl: 'Οι ημερομηνίες συμβολαίου είναι έγκυρες',
        });
      }

      // Warning for expiring contracts
      if (contract.endDate) {
        const daysUntilExpiry = Math.ceil(
          (new Date(contract.endDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
          results.push({
            field: 'contractExpiry',
            fieldEl: 'Λήξη Συμβολαίου',
            status: 'warning',
            message: t.warnings.contractExpiring,
            messageEl: 'Το συμβόλαιο λήγει εντός 30 ημερών',
            code: 'CONTRACT_EXPIRING',
            suggestion: 'Consider renewing the contract soon',
            suggestionEl: 'Σκεφτείτε να ανανεώσετε το συμβόλαιο σύντομα',
          });
        }
      }

      // Unusual salary warning
      if (contract.salary > 5000) {
        results.push({
          field: 'salary',
          fieldEl: 'Μισθός',
          status: 'warning',
          message: t.warnings.unusualSalary,
          messageEl: 'Ο μισθός φαίνεται ασυνήθιστα υψηλός',
          code: 'UNUSUAL_SALARY',
          suggestion: 'Please verify salary amount',
          suggestionEl: 'Παρακαλώ επιβεβαιώστε το ποσό του μισθού',
        });
      }

      return results;
    },
    [t]
  );

  // Run validation
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    const allResults: ValidationResult[] = [];

    // Validate employees
    employees.forEach(employee => {
      const employeeResults = validateEmployeeData(employee);
      allResults.push(
        ...employeeResults.map(r => ({
          ...r,
          field: `employee_${employee.id}_${r.field}`,
        }))
      );
    });

    // Validate contracts
    contracts.forEach(contract => {
      const contractResults = validateContractData(contract);
      allResults.push(
        ...contractResults.map(r => ({
          ...r,
          field: `contract_${contract.id}_${r.field}`,
        }))
      );
    });

    // Simulate API validation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    setValidationResults(allResults);

    // Calculate summary
    const validCount = allResults.filter(r => r.status === 'valid').length;
    const invalidCount = allResults.filter(r => r.status === 'invalid').length;
    const warningCount = allResults.filter(r => r.status === 'warning').length;
    const total = allResults.length;
    const score = total > 0 ? Math.round((validCount / total) * 100) : 0;

    setValidationSummary({
      totalChecks: total,
      validChecks: validCount,
      invalidChecks: invalidCount,
      warningChecks: warningCount,
      overallScore: score,
      readyToSubmit: invalidCount === 0,
    });

    setIsValidating(false);
  }, [employees, contracts, validateEmployeeData, validateContractData]);

  // Auto-validate when data changes
  useEffect(() => {
    if (autoValidate && employees.length > 0) {
      runValidation();
    }
  }, [employees, contracts, autoValidate, runValidation]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'text-green-600';
      case 'invalid':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return CheckCircle;
      case 'invalid':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'invalid':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCheck className="h-8 w-8 text-blue-600" />
                </div>
                {t.title}
              </h1>
              <p className="text-gray-600 ml-12">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={runValidation}
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t.validation.validating}
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    {t.actions.validate}
                  </>
                )}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={!validationSummary.readyToSubmit}
              >
                <Send className="h-4 w-4 mr-2" />
                {t.actions.submit}
              </Button>
            </div>
          </div>

          {/* Validation Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validationSummary.overallScore}%
                </div>
                <div className="text-sm text-gray-600">
                  {t.validation.overallScore}
                </div>
                <Progress
                  value={validationSummary.overallScore}
                  className="mt-2"
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {validationSummary.totalChecks}
                </div>
                <div className="text-sm text-gray-600">
                  {t.validation.totalChecks}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validationSummary.validChecks}
                </div>
                <div className="text-sm text-gray-600">
                  {t.validation.validChecks}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {validationSummary.invalidChecks}
                </div>
                <div className="text-sm text-gray-600">
                  {t.validation.invalidChecks}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationSummary.warningChecks}
                </div>
                <div className="text-sm text-gray-600">
                  {t.validation.warningChecks}
                </div>
              </div>
            </Card>
          </div>

          {/* Ready Status */}
          <div className="text-center mb-6">
            {validationSummary.readyToSubmit ? (
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-full font-medium">
                <CheckCircle className="h-5 w-5" />
                {t.validation.readyToSubmit}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-6 py-3 rounded-full font-medium">
                <AlertCircle className="h-5 w-5" />
                {t.validation.notReady}
              </div>
            )}
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">{t.tabs.dashboard}</TabsTrigger>
            <TabsTrigger value="employees">{t.tabs.employees}</TabsTrigger>
            <TabsTrigger value="contracts">{t.tabs.contracts}</TabsTrigger>
            <TabsTrigger value="workCards">{t.tabs.workCards}</TabsTrigger>
            <TabsTrigger value="validation">{t.tabs.validation}</TabsTrigger>
            <TabsTrigger value="settings">{t.tabs.settings}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Validation Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Validation Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Valid Checks</span>
                      </div>
                      <div className="text-sm font-medium">
                        {validationSummary.validChecks}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Invalid Checks</span>
                      </div>
                      <div className="text-sm font-medium">
                        {validationSummary.invalidChecks}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Warning Checks</span>
                      </div>
                      <div className="text-sm font-medium">
                        {validationSummary.warningChecks}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Critical Issues */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Critical Issues to Fix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {validationResults
                      .filter(result => result.status === 'invalid')
                      .slice(0, 5)
                      .map((result, index) => {
                        const Icon = getStatusIcon(result.status);
                        return (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 border border-red-200 rounded-lg bg-red-50"
                          >
                            <Icon className="h-4 w-4 text-red-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {locale === 'en'
                                  ? result.field
                                  : result.fieldEl}
                              </div>
                              <div className="text-xs text-red-700">
                                {locale === 'en'
                                  ? result.message
                                  : result.messageEl}
                              </div>
                              {result.suggestion && (
                                <div className="text-xs text-red-600 mt-1">
                                  {locale === 'en'
                                    ? result.suggestion
                                    : result.suggestionEl}
                                </div>
                              )}
                            </div>
                            <Button size="sm" variant="outline">
                              {t.actions.fix}
                            </Button>
                          </div>
                        );
                      })}
                    {validationResults.filter(r => r.status === 'invalid')
                      .length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No critical issues found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Validation Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Validation Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">12:34 PM</span>
                    <span>Employee data validated successfully</span>
                    <Badge className="bg-green-100 text-green-800">
                      ✓ Valid
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">12:32 PM</span>
                    <span>
                      Contract validation failed - Invalid working hours
                    </span>
                    <Badge className="bg-red-100 text-red-800">✗ Invalid</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-600">12:30 PM</span>
                    <span>Salary amount warning - Unusually high</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      ⚠ Warning
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Employee Data Validation
                  </CardTitle>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t.actions.add}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees.map(employee => {
                    const employeeResults = validationResults.filter(r =>
                      r.field.startsWith(`employee_${employee.id}`)
                    );
                    const hasErrors = employeeResults.some(
                      r => r.status === 'invalid'
                    );
                    const hasWarnings = employeeResults.some(
                      r => r.status === 'warning'
                    );

                    return (
                      <div
                        key={employee.id}
                        className={`p-4 border rounded-lg ${
                          hasErrors
                            ? 'border-red-200 bg-red-50'
                            : hasWarnings
                              ? 'border-yellow-200 bg-yellow-50'
                              : 'border-green-200 bg-green-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">
                              {employee.firstName} {employee.lastName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              AFM: {employee.afm} • AMKA: {employee.amka}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasErrors && (
                              <Badge className="bg-red-100 text-red-800">
                                {
                                  employeeResults.filter(
                                    r => r.status === 'invalid'
                                  ).length
                                }{' '}
                                Errors
                              </Badge>
                            )}
                            {hasWarnings && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                {
                                  employeeResults.filter(
                                    r => r.status === 'warning'
                                  ).length
                                }{' '}
                                Warnings
                              </Badge>
                            )}
                            {!hasErrors && !hasWarnings && (
                              <Badge className="bg-green-100 text-green-800">
                                Valid
                              </Badge>
                            )}
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4 mr-1" />
                              {t.actions.edit}
                            </Button>
                          </div>
                        </div>

                        {employeeResults.length > 0 && (
                          <div className="space-y-2">
                            {employeeResults.map((result, idx) => {
                              const Icon = getStatusIcon(result.status);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <Icon
                                    className={`h-4 w-4 mt-0.5 ${getStatusColor(result.status)}`}
                                  />
                                  <div className="flex-1">
                                    <span className="font-medium">
                                      {locale === 'en'
                                        ? result.field.split('_').pop()
                                        : result.fieldEl}
                                      :
                                    </span>
                                    <span className="ml-2">
                                      {locale === 'en'
                                        ? result.message
                                        : result.messageEl}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Contract Validation
                  </CardTitle>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t.actions.add}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contracts.map(contract => {
                    const contractResults = validationResults.filter(r =>
                      r.field.startsWith(`contract_${contract.id}`)
                    );
                    const hasErrors = contractResults.some(
                      r => r.status === 'invalid'
                    );
                    const hasWarnings = contractResults.some(
                      r => r.status === 'warning'
                    );
                    const employee = employees.find(
                      e => e.id === contract.employeeId
                    );

                    return (
                      <div
                        key={contract.id}
                        className={`p-4 border rounded-lg ${
                          hasErrors
                            ? 'border-red-200 bg-red-50'
                            : hasWarnings
                              ? 'border-yellow-200 bg-yellow-50'
                              : 'border-green-200 bg-green-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">
                              {contract.position}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {employee?.firstName} {employee?.lastName} •
                              {contract.contractType} • €{contract.salary}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasErrors && (
                              <Badge className="bg-red-100 text-red-800">
                                {
                                  contractResults.filter(
                                    r => r.status === 'invalid'
                                  ).length
                                }{' '}
                                Errors
                              </Badge>
                            )}
                            {hasWarnings && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                {
                                  contractResults.filter(
                                    r => r.status === 'warning'
                                  ).length
                                }{' '}
                                Warnings
                              </Badge>
                            )}
                            {!hasErrors && !hasWarnings && (
                              <Badge className="bg-green-100 text-green-800">
                                Valid
                              </Badge>
                            )}
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4 mr-1" />
                              {t.actions.edit}
                            </Button>
                          </div>
                        </div>

                        {contractResults.length > 0 && (
                          <div className="space-y-2">
                            {contractResults.map((result, idx) => {
                              const Icon = getStatusIcon(result.status);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <Icon
                                    className={`h-4 w-4 mt-0.5 ${getStatusColor(result.status)}`}
                                  />
                                  <div className="flex-1">
                                    <span className="font-medium">
                                      {locale === 'en'
                                        ? result.field.split('_').pop()
                                        : result.fieldEl}
                                      :
                                    </span>
                                    <span className="ml-2">
                                      {locale === 'en'
                                        ? result.message
                                        : result.messageEl}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Cards Tab */}
          <TabsContent value="workCards" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Digital Work Cards Validation
                  </CardTitle>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t.actions.add}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workCards.map(workCard => {
                    const employee = employees.find(
                      e => e.id === workCard.employeeId
                    );

                    return (
                      <div
                        key={workCard.id}
                        className="p-4 border border-green-200 bg-green-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">
                              {employee?.firstName} {employee?.lastName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {workCard.date} • {workCard.startTime} -{' '}
                              {workCard.endTime} • {workCard.location}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              Valid
                            </Badge>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4 mr-1" />
                              {t.actions.edit}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Work Type:</span>
                            <span className="ml-2">{workCard.workType}</span>
                          </div>
                          <div>
                            <span className="font-medium">Break:</span>
                            <span className="ml-2">
                              {workCard.breakDuration} min
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {workCard.overtime && (
                              <Badge variant="outline">Overtime</Badge>
                            )}
                            {workCard.nightShift && (
                              <Badge variant="outline">Night Shift</Badge>
                            )}
                            {workCard.holidayWork && (
                              <Badge variant="outline">Holiday</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validation Results Tab */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCheck className="h-5 w-5" />
                    Detailed Validation Results
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="invalid">Errors</SelectItem>
                        <SelectItem value="warning">Warnings</SelectItem>
                        <SelectItem value="valid">Valid</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      {t.actions.export}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {validationResults.map((result, index) => {
                    const Icon = getStatusIcon(result.status);
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <Icon
                          className={`h-5 w-5 mt-0.5 ${getStatusColor(result.status)}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {locale === 'en' ? result.field : result.fieldEl}
                            </span>
                            <Badge className={getStatusBadge(result.status)}>
                              {
                                t.validation[
                                  result.status as keyof typeof t.validation
                                ]
                              }
                            </Badge>
                            {result.code && (
                              <Badge variant="outline" className="text-xs">
                                {result.code}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {locale === 'en'
                              ? result.message
                              : result.messageEl}
                          </p>
                          {result.suggestion && (
                            <p className="text-xs text-blue-600">
                              💡{' '}
                              {locale === 'en'
                                ? result.suggestion
                                : result.suggestionEl}
                            </p>
                          )}
                        </div>
                        {result.status === 'invalid' && (
                          <Button size="sm" variant="outline">
                            {t.actions.fix}
                          </Button>
                        )}
                        {result.status === 'warning' && (
                          <Button size="sm" variant="ghost">
                            {t.actions.ignore}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {validationResults.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>
                        No validation results yet. Click "Validate All" to
                        start.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Validation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    ERGANI Connection
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        ERGANI API Endpoint
                      </label>
                      <Input defaultValue="https://api.ergani.gov.gr/v2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        API Key
                      </label>
                      <Input
                        type="password"
                        defaultValue="************************"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Validation Rules</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">
                          Auto-validate on changes
                        </label>
                        <p className="text-sm text-gray-600">
                          Automatically run validation when data changes
                        </p>
                      </div>
                      <Button
                        variant={autoValidate ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAutoValidate(!autoValidate)}
                      >
                        {autoValidate ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">
                          Strict AFM validation
                        </label>
                        <p className="text-sm text-gray-600">
                          Enable checksum validation for AFM numbers
                        </p>
                      </div>
                      <Button variant="default" size="sm">
                        Enabled
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">
                          Salary threshold warnings
                        </label>
                        <p className="text-sm text-gray-600">
                          Warn for unusually high or low salaries
                        </p>
                      </div>
                      <Button variant="default" size="sm">
                        Enabled
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
