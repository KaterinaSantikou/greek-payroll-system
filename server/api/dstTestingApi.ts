/**
 * DST Testing API - Comprehensive endpoints for testing timezone transition handling
 */

import { Request, Response } from 'express';
import { timezoneTestService } from '../services/TimezoneTestService';
import { dstTransitionService } from '../services/DSTTransitionService';
import { dstAwareOvertimeService } from '../services/DSTAwareOvertimeService';
import { internationalTimezoneService } from '../services/InternationalTimezoneService';

export async function executeAllDSTTests(req: Request, res: Response): Promise<void> {
  try {
    const testResults = await timezoneTestService.executeAllDSTTests();
    const testReport = timezoneTestService.generateTestReport(testResults.results);

    res.json({
      success: true,
      testResults,
      textReport: testReport,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('DST testing failed:', error);
    res.status(500).json({
      success: false,
      error: 'DST testing execution failed',
      message: error.message
    });
  }
}

export async function calculateDSTAwareShift(req: Request, res: Response): Promise<void> {
  try {
    const { shiftStart, shiftEnd, timezone = 'Europe/Athens' } = req.body;

    if (!shiftStart || !shiftEnd) {
      res.status(400).json({
        success: false,
        error: 'shiftStart and shiftEnd are required'
      });
      return;
    }

    const calculation = dstTransitionService.calculateDSTAwareWorkingTime(
      new Date(shiftStart),
      new Date(shiftEnd),
      timezone
    );

    res.json({
      success: true,
      calculation,
      timezone,
      calculatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('DST calculation failed:', error);
    res.status(500).json({
      success: false,
      error: 'DST calculation failed',
      message: error.message
    });
  }
}

export async function calculateDSTAwareOvertime(req: Request, res: Response): Promise<void> {
  try {
    const {
      employeeId,
      shiftStart,
      shiftEnd,
      hourlyRate,
      isHoliday = false,
      isSunday = false,
      timezone = 'Europe/Athens'
    } = req.body;

    if (!employeeId || !shiftStart || !shiftEnd || !hourlyRate) {
      res.status(400).json({
        success: false,
        error: 'employeeId, shiftStart, shiftEnd, and hourlyRate are required'
      });
      return;
    }

    const shiftPeriod = {
      start: new Date(shiftStart),
      end: new Date(shiftEnd),
      employeeId,
      shiftType: 'regular' as const,
      scheduledHours: 8,
      breakMinutes: 30,
      hourlyRate: parseFloat(hourlyRate),
      contractType: 'full-time'
    };

    const overtimeResult = await dstAwareOvertimeService.calculateShiftOvertime(
      shiftPeriod,
      isHoliday,
      isSunday
    );

    res.json({
      success: true,
      overtimeResult,
      calculatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('DST overtime calculation failed:', error);
    res.status(500).json({
      success: false,
      error: 'DST overtime calculation failed',
      message: error.message
    });
  }
}

export async function getDSTTransitions(req: Request, res: Response): Promise<void> {
  try {
    const { year } = req.params;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const transitions = dstTransitionService.getDSTTransitions(targetYear);

    res.json({
      success: true,
      year: targetYear,
      transitions,
      timezone: 'Europe/Athens'
    });
  } catch (error) {
    console.error('Failed to get DST transitions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get DST transitions',
      message: error.message
    });
  }
}

export async function validateTimezone(req: Request, res: Response): Promise<void> {
  try {
    const { date, time, timezone = 'Europe/Athens' } = req.body;

    if (!date || !time) {
      res.status(400).json({
        success: false,
        error: 'date and time are required'
      });
      return;
    }

    const targetDate = new Date(date);
    const validation = dstTransitionService.validateTimeExists(targetDate, time, timezone);

    res.json({
      success: true,
      validation,
      date,
      time,
      timezone
    });
  } catch (error) {
    console.error('Time validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Time validation failed',
      message: error.message
    });
  }
}

export async function convertTimezones(req: Request, res: Response): Promise<void> {
  try {
    const { dateTime, fromTimezone, toTimezone } = req.body;

    if (!dateTime || !fromTimezone || !toTimezone) {
      res.status(400).json({
        success: false,
        error: 'dateTime, fromTimezone, and toTimezone are required'
      });
      return;
    }

    const conversion = internationalTimezoneService.convertBetweenTimezones(
      new Date(dateTime),
      fromTimezone,
      toTimezone
    );

    res.json({
      success: true,
      conversion
    });
  } catch (error) {
    console.error('Timezone conversion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Timezone conversion failed',
      message: error.message
    });
  }
}

export async function calculateRemoteWork(req: Request, res: Response): Promise<void> {
  try {
    const {
      employeeId,
      shiftStart,
      shiftEnd,
      timezone,
      remoteTimezone,
      hourlyRate,
      currency = 'EUR'
    } = req.body;

    if (!employeeId || !shiftStart || !shiftEnd || !timezone || !remoteTimezone || !hourlyRate) {
      res.status(400).json({
        success: false,
        error: 'All shift parameters are required for remote work calculation'
      });
      return;
    }

    const shift = {
      employeeId,
      localStart: new Date(shiftStart),
      localEnd: new Date(shiftEnd),
      timezone,
      remoteTimezone,
      hourlyRate: parseFloat(hourlyRate),
      currency
    };

    const remoteWorkCalc = internationalTimezoneService.calculateRemoteWorkingHours(shift);

    res.json({
      success: true,
      remoteWorkCalculation: remoteWorkCalc,
      shift
    });
  } catch (error) {
    console.error('Remote work calculation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Remote work calculation failed',
      message: error.message
    });
  }
}

export async function generateScheduleRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const {
      startTime,
      endTime,
      workDays,
      startDate,
      endDate
    } = req.body;

    if (!startTime || !endTime || !workDays || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Schedule parameters are required'
      });
      return;
    }

    const schedule = dstTransitionService.generateDSTAwareSchedule(
      { startTime, endTime, workDays },
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      schedule,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Schedule generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Schedule generation failed',
      message: error.message
    });
  }
}

export async function findOptimalMeetingTime(req: Request, res: Response): Promise<void> {
  try {
    const { participants, duration, preferredDate } = req.body;

    if (!participants || !duration || !preferredDate) {
      res.status(400).json({
        success: false,
        error: 'participants, duration, and preferredDate are required'
      });
      return;
    }

    const meetingAnalysis = internationalTimezoneService.findOptimalMeetingTime(
      participants,
      duration,
      new Date(preferredDate)
    );

    res.json({
      success: true,
      meetingAnalysis
    });
  } catch (error) {
    console.error('Meeting time optimization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Meeting time optimization failed',
      message: error.message
    });
  }
}