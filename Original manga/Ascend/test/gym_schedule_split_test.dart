import 'package:flutter_test/flutter_test.dart';
import 'package:ascend/core/models/gym_workout_template.dart';

void main() {
  group('5-Day Gym Split Schedule Tests (Mon/Wed Rest, Tue Legs Start)', () {
    late List<GymWorkoutTemplate> defaultTemplates;

    setUp(() {
      defaultTemplates = const [
        GymWorkoutTemplate(
          id: 'tpl_split_legs',
          name: 'Day 1 — Legs & Lower Body (Tue)',
          description: 'Quad hypertrophy, heavy squats, Romanian deadlifts, and calves.',
          exerciseIds: ['gym_barbell_squat', 'gym_romanian_deadlift', 'gym_leg_press'],
          splitCategory: 'Legs',
        ),
        GymWorkoutTemplate(
          id: 'tpl_split_back_biceps',
          name: 'Day 2 — Back & Biceps (Thu)',
          description: 'Heavy posterior pulling, deadlifts, lat pulldowns, rows, and bicep peaks.',
          exerciseIds: ['gym_barbell_deadlift', 'gym_lat_pulldown', 'gym_barbell_row'],
          splitCategory: 'Pull',
        ),
        GymWorkoutTemplate(
          id: 'tpl_split_chest_triceps',
          name: 'Day 3 — Chest & Triceps (Fri)',
          description: 'Horizontal & incline pressing, cable flyes, dips, and tricep lockout overload.',
          exerciseIds: ['gym_bench_press', 'gym_incline_db_press', 'gym_cable_flyes'],
          splitCategory: 'Push',
        ),
        GymWorkoutTemplate(
          id: 'tpl_split_core_others',
          name: 'Day 4 — Core, Abs & Functional (Sat)',
          description: 'Rotational core power, hanging leg raises, grip strength, and traps.',
          exerciseIds: ['gym_hanging_leg_raises', 'gym_cable_woodchops', 'gym_ab_wheel_rollout'],
          splitCategory: 'Core',
        ),
        GymWorkoutTemplate(
          id: 'tpl_split_full_body',
          name: 'Day 5 — Full Body Hypertrophy (Sun)',
          description: 'Compound power finishing the week: overhead press, pull-ups, squats, and lateral delts.',
          exerciseIds: ['gym_overhead_press', 'gym_pullups', 'gym_barbell_squat'],
          splitCategory: 'Full Body',
        ),
      ];
    });

    GymWorkoutTemplate? getScheduledSplitForDay(int weekday, List<GymWorkoutTemplate> templates) {
      String searchId;
      switch (weekday) {
        case DateTime.tuesday:
          searchId = 'tpl_split_legs';
          break;
        case DateTime.thursday:
          searchId = 'tpl_split_back_biceps';
          break;
        case DateTime.friday:
          searchId = 'tpl_split_chest_triceps';
          break;
        case DateTime.saturday:
          searchId = 'tpl_split_core_others';
          break;
        case DateTime.sunday:
          searchId = 'tpl_split_full_body';
          break;
        default:
          return null; // Monday & Wednesday Rest Days
      }

      try {
        return templates.firstWhere((t) => t.id == searchId);
      } catch (_) {
        return templates.isNotEmpty ? templates.first : null;
      }
    }

    test('Monday (Day 1) is a designated REST day', () {
      final split = getScheduledSplitForDay(DateTime.monday, defaultTemplates);
      expect(split, isNull);
    });

    test('Tuesday (Day 2) is Day 1: Legs & Lower Body', () {
      final split = getScheduledSplitForDay(DateTime.tuesday, defaultTemplates);
      expect(split, isNotNull);
      expect(split!.id, 'tpl_split_legs');
      expect(split.name, contains('Legs'));
      expect(split.splitCategory, 'Legs');
      expect(split.exerciseIds, contains('gym_barbell_squat'));
    });

    test('Wednesday (Day 3) is a designated REST day', () {
      final split = getScheduledSplitForDay(DateTime.wednesday, defaultTemplates);
      expect(split, isNull);
    });

    test('Thursday (Day 4) is Day 2: Back & Biceps', () {
      final split = getScheduledSplitForDay(DateTime.thursday, defaultTemplates);
      expect(split, isNotNull);
      expect(split!.id, 'tpl_split_back_biceps');
      expect(split.name, contains('Back & Biceps'));
      expect(split.splitCategory, 'Pull');
      expect(split.exerciseIds, contains('gym_barbell_deadlift'));
    });

    test('Friday (Day 5) is Day 3: Chest & Triceps', () {
      final split = getScheduledSplitForDay(DateTime.friday, defaultTemplates);
      expect(split, isNotNull);
      expect(split!.id, 'tpl_split_chest_triceps');
      expect(split.name, contains('Chest & Triceps'));
      expect(split.splitCategory, 'Push');
      expect(split.exerciseIds, contains('gym_bench_press'));
    });

    test('Saturday (Day 6) is Day 4: Core & Others', () {
      final split = getScheduledSplitForDay(DateTime.saturday, defaultTemplates);
      expect(split, isNotNull);
      expect(split!.id, 'tpl_split_core_others');
      expect(split.name, contains('Core'));
      expect(split.splitCategory, 'Core');
      expect(split.exerciseIds, contains('gym_hanging_leg_raises'));
    });

    test('Sunday (Day 7) is Day 5: Full Body Hypertrophy', () {
      final split = getScheduledSplitForDay(DateTime.sunday, defaultTemplates);
      expect(split, isNotNull);
      expect(split!.id, 'tpl_split_full_body');
      expect(split.name, contains('Full Body'));
      expect(split.splitCategory, 'Full Body');
      expect(split.exerciseIds, contains('gym_overhead_press'));
    });

    test('Handles edge cases: empty template list on rest and active days gracefully', () {
      expect(getScheduledSplitForDay(DateTime.monday, []), isNull);
      expect(getScheduledSplitForDay(DateTime.wednesday, []), isNull);
      expect(getScheduledSplitForDay(DateTime.tuesday, []), isNull);
    });
  });
}
