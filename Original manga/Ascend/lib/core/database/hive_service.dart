import 'package:hive_flutter/hive_flutter.dart';
import 'package:ascend/core/database/database_keys.dart';
import 'package:ascend/core/models/achievement.dart';
import 'package:ascend/core/models/activity.dart';
import 'package:ascend/core/models/body_metric.dart';
import 'package:ascend/core/models/exercise_log.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/models/gym_session.dart';
import 'package:ascend/core/models/gym_workout_template.dart';
import 'package:ascend/core/models/nutrition_entry.dart';
import 'package:ascend/core/models/posture_checkin.dart';
import 'package:ascend/core/models/routine.dart';
import 'package:ascend/core/models/user_profile.dart';

class HiveService {
  HiveService._internal();
  static final HiveService instance = HiveService._internal();

  late Box activitiesBox;
  late Box routinesBox;
  late Box exerciseLogsBox;
  late Box gymExercisesBox;
  late Box gymTemplatesBox;
  late Box gymSessionsBox;
  late Box nutritionEntriesBox;
  late Box userProfileBox;
  late Box progressPhotosBox;
  late Box bodyMetricsBox;
  late Box postureCheckinsBox;
  late Box achievementsBox;
  late Box dailyNotesBox;
  late Box waterLogsBox;
  late Box settingsBox;

  Future<void> init() async {
    await Hive.initFlutter();

    activitiesBox = await Hive.openBox(DatabaseKeys.activitiesBox);
    routinesBox = await Hive.openBox(DatabaseKeys.routinesBox);
    exerciseLogsBox = await Hive.openBox(DatabaseKeys.exerciseLogsBox);
    gymExercisesBox = await Hive.openBox(DatabaseKeys.gymExercisesBox);
    gymTemplatesBox = await Hive.openBox(DatabaseKeys.gymTemplatesBox);
    gymSessionsBox = await Hive.openBox(DatabaseKeys.gymSessionsBox);
    nutritionEntriesBox = await Hive.openBox(DatabaseKeys.nutritionEntriesBox);
    userProfileBox = await Hive.openBox(DatabaseKeys.userProfileBox);
    progressPhotosBox = await Hive.openBox(DatabaseKeys.progressPhotosBox);
    bodyMetricsBox = await Hive.openBox(DatabaseKeys.bodyMetricsBox);
    postureCheckinsBox = await Hive.openBox(DatabaseKeys.postureCheckinsBox);
    achievementsBox = await Hive.openBox(DatabaseKeys.achievementsBox);
    dailyNotesBox = await Hive.openBox(DatabaseKeys.dailyNotesBox);
    waterLogsBox = await Hive.openBox(DatabaseKeys.waterLogsBox);
    settingsBox = await Hive.openBox(DatabaseKeys.settingsBox);

    await _seedInitialDataIfEmpty();
  }

  Future<void> _seedInitialDataIfEmpty() async {
    // 1. Seed Activities if empty
    if (activitiesBox.isEmpty) {
      final defaultActivities = [
        const Activity(
          id: 'act_chin_tucks',
          title: 'Chin Tucks',
          description: 'Retract head straight back creating a double chin to strengthen deep cervical flexors.',
          type: ActivityType.reps,
          category: ActivityCategory.posture,
          defaultReps: 12,
          defaultSets: 3,
          targetArea: 'Cervical Spine',
        ),
        const Activity(
          id: 'act_wall_angels',
          title: 'Wall Angels',
          description: 'Stand flat against wall, slide arms up and down keeping elbows and wrists in contact.',
          type: ActivityType.reps,
          category: ActivityCategory.posture,
          defaultReps: 10,
          defaultSets: 3,
          targetArea: 'Thoracic & Scapula',
        ),
        const Activity(
          id: 'act_doorway_pec',
          title: 'Doorway Pec Stretch',
          description: 'Place forearm against doorframe, step forward to open tight anterior chest muscles.',
          type: ActivityType.time,
          category: ActivityCategory.posture,
          defaultDurationSeconds: 45,
          defaultSets: 2,
          targetArea: 'Chest & Anterior Shoulders',
        ),
        const Activity(
          id: 'act_glute_bridges',
          title: 'Glute Bridges',
          description: 'Lie on back, drive through heels to contract glutes and neutralize anterior pelvic tilt.',
          type: ActivityType.reps,
          category: ActivityCategory.posture,
          defaultReps: 15,
          defaultSets: 3,
          targetArea: 'Pelvic Alignment',
        ),
        const Activity(
          id: 'act_dead_hang',
          title: 'Dead Hang Decompression',
          description: 'Hang passively from pull-up bar allowing spinal gravity traction.',
          type: ActivityType.time,
          category: ActivityCategory.mobility,
          defaultDurationSeconds: 45,
          defaultSets: 2,
          targetArea: 'Spine Decompression',
        ),
        const Activity(
          id: 'act_cat_cow',
          title: 'Cat-Cow Flow',
          description: 'Synchronized spinal flexion and extension on all fours.',
          type: ActivityType.time,
          category: ActivityCategory.mobility,
          defaultDurationSeconds: 60,
          defaultSets: 2,
          targetArea: 'Thoracic Mobility',
        ),
        const Activity(
          id: 'act_outdoor_run',
          title: 'Zone 2 Outdoor Run',
          description: 'Aerobic base building cardio at conversational pace.',
          type: ActivityType.cardio,
          category: ActivityCategory.cardio,
          defaultDurationSeconds: 1800,
          targetArea: 'Cardiovascular Base',
        ),
      ];

      for (final act in defaultActivities) {
        await activitiesBox.put(act.id, act.toMap());
      }
    }

    // 2. Seed Routines if empty
    if (routinesBox.isEmpty) {
      final defaultRoutines = [
        Routine(
          id: 'rt_morning_posture',
          title: 'Morning Spine Reset',
          description: 'Quick morning mobility routine to awaken cervical and thoracic posture.',
          activityIds: ['act_chin_tucks', 'act_wall_angels', 'act_cat_cow'],
          timeOfDay: TimeOfDayCategory.morning,
          daysOfWeek: [], // Every day
          reminderTime: '07:30',
          createdAt: DateTime.now(),
        ),
        Routine(
          id: 'rt_desk_break',
          title: 'Midday Desk Anti-Slump',
          description: 'Counter computer slouch and rounded shoulders after hours of sitting.',
          activityIds: ['act_doorway_pec', 'act_chin_tucks', 'act_dead_hang'],
          timeOfDay: TimeOfDayCategory.afternoon,
          daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
          reminderTime: '13:30',
          createdAt: DateTime.now(),
        ),
      ];

      for (final rt in defaultRoutines) {
        await routinesBox.put(rt.id, rt.toMap());
      }
    }

    // 3. Seed Gym Exercises (Comprehensive Library)
    if (gymExercisesBox.isEmpty || gymExercisesBox.length < 25) {
      final defaultGymExercises = [
        // LEGS
        const GymExercise(
          id: 'gym_barbell_squat',
          name: 'Barbell Back Squat',
          primaryMuscle: MuscleGroup.legs,
          secondaryMuscle: 'Glutes, Core, Hamstrings',
          equipment: EquipmentType.barbell,
          instructions: 'Brace core with Valsalva, break at hips and knees, squat to parallel or below.',
          defaultSets: 4,
          defaultReps: 6,
          defaultWeightKg: 90.0,
        ),
        const GymExercise(
          id: 'gym_romanian_deadlift',
          name: 'Romanian Deadlift (RDL)',
          primaryMuscle: MuscleGroup.legs,
          secondaryMuscle: 'Hamstrings, Glutes',
          equipment: EquipmentType.barbell,
          instructions: 'Soft knees, hinge hips straight back until deep hamstring tension, drive hips forward.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 60.0,
        ),
        const GymExercise(
          id: 'gym_leg_press',
          name: 'Leg Press (45 Degree)',
          primaryMuscle: MuscleGroup.legs,
          secondaryMuscle: 'Quads, Adductors',
          equipment: EquipmentType.machine,
          instructions: 'Feet shoulder-width on platform, lower sled to 90 degrees knee flexion, press smoothly.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 140.0,
        ),
        const GymExercise(
          id: 'gym_bulgarian_split_squat',
          name: 'Bulgarian Split Squat',
          primaryMuscle: MuscleGroup.legs,
          secondaryMuscle: 'Glutes, Hamstrings, Core',
          equipment: EquipmentType.dumbbell,
          instructions: 'Rear foot elevated on bench, lower front thigh until parallel to floor, drive through heel.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 16.0,
        ),
        const GymExercise(
          id: 'gym_leg_extension',
          name: 'Leg Extensions',
          primaryMuscle: MuscleGroup.legs,
          secondaryMuscle: 'Rectus Femoris, Quads',
          equipment: EquipmentType.machine,
          instructions: 'Align knee joint with machine pivot, extend legs to full lockout, squeeze quads for 1 sec.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 45.0,
        ),
        const GymExercise(
          id: 'gym_seated_leg_curl',
          name: 'Seated Hamstring Curl',
          primaryMuscle: MuscleGroup.legs,
          secondaryMuscle: 'Hamstrings, Calves',
          equipment: EquipmentType.machine,
          instructions: 'Lock thighs beneath pad, flex knees smoothly pulling heels under seat, control return.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 40.0,
        ),
        const GymExercise(
          id: 'gym_standing_calf_raise',
          name: 'Standing Calf Raises',
          primaryMuscle: MuscleGroup.legs,
          secondaryMuscle: 'Gastrocnemius, Soleus',
          equipment: EquipmentType.machine,
          instructions: 'Full stretch at bottom of step, drive onto balls of feet, hold peak contraction 2 secs.',
          defaultSets: 4,
          defaultReps: 15,
          defaultWeightKg: 60.0,
        ),

        // BACK
        const GymExercise(
          id: 'gym_barbell_deadlift',
          name: 'Conventional Deadlift',
          primaryMuscle: MuscleGroup.back,
          secondaryMuscle: 'Hamstrings, Glutes, Traps',
          equipment: EquipmentType.barbell,
          instructions: 'Hinge at hips, pull slack out of the bar, lock out with glute contraction.',
          defaultSets: 3,
          defaultReps: 5,
          defaultWeightKg: 110.0,
        ),
        const GymExercise(
          id: 'gym_lat_pulldown',
          name: 'Wide-Grip Lat Pulldown',
          primaryMuscle: MuscleGroup.back,
          secondaryMuscle: 'Lats, Rhomboids, Biceps',
          equipment: EquipmentType.cable,
          instructions: 'Slight lean back, pull bar to collarbone driving elbows down and back into ribs.',
          defaultSets: 4,
          defaultReps: 10,
          defaultWeightKg: 55.0,
        ),
        const GymExercise(
          id: 'gym_barbell_row',
          name: 'Bent-Over Barbell Row',
          primaryMuscle: MuscleGroup.back,
          secondaryMuscle: 'Lats, Rhomboids, Biceps',
          equipment: EquipmentType.barbell,
          instructions: '45 degree torso angle, pull bar towards belly button while squeezing shoulder blades.',
          defaultSets: 4,
          defaultReps: 8,
          defaultWeightKg: 60.0,
        ),
        const GymExercise(
          id: 'gym_pullups',
          name: 'Pull-Ups / Chin-Ups',
          primaryMuscle: MuscleGroup.back,
          secondaryMuscle: 'Biceps, Rear Delts',
          equipment: EquipmentType.bodyweight,
          instructions: 'Full deadhang at bottom, pull chest to bar with scapular depression.',
          defaultSets: 3,
          defaultReps: 8,
          defaultWeightKg: 0.0,
        ),
        const GymExercise(
          id: 'gym_seated_cable_row',
          name: 'Seated Cable Row (Close Grip)',
          primaryMuscle: MuscleGroup.back,
          secondaryMuscle: 'Mid Back, Rhomboids, Biceps',
          equipment: EquipmentType.cable,
          instructions: 'Upright chest, pull V-bar to navel, flare chest out and squeeze shoulder blades.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 50.0,
        ),
        const GymExercise(
          id: 'gym_single_arm_db_row',
          name: 'Single-Arm Dumbbell Row',
          primaryMuscle: MuscleGroup.back,
          secondaryMuscle: 'Lats, Forearms',
          equipment: EquipmentType.dumbbell,
          instructions: 'Support torso on bench, row dumbbell in an arc toward hip pocket.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 26.0,
        ),
        const GymExercise(
          id: 'gym_face_pulls',
          name: 'Cable Face Pulls',
          primaryMuscle: MuscleGroup.back,
          secondaryMuscle: 'Rear Delts, Rotator Cuff, Traps',
          equipment: EquipmentType.cable,
          instructions: 'Set rope at eye level, pull handles apart toward ears with external rotation.',
          defaultSets: 3,
          defaultReps: 15,
          defaultWeightKg: 20.0,
        ),

        // BICEPS
        const GymExercise(
          id: 'gym_standing_barbell_curl',
          name: 'Standing Barbell Bicep Curl',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Biceps Brachii, Forearms',
          equipment: EquipmentType.barbell,
          instructions: 'Shoulders pinned, curl bar upward without swinging torso, control eccentric descent.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 30.0,
        ),
        const GymExercise(
          id: 'gym_incline_db_curl',
          name: 'Incline Dumbbell Curl',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Biceps Long Head',
          equipment: EquipmentType.dumbbell,
          instructions: 'Bench at 60 degrees, let arms hang for maximum stretch, supinate wrists at top.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 12.0,
        ),
        const GymExercise(
          id: 'gym_hammer_curls',
          name: 'Dumbbell Hammer Curls',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Brachialis, Forearms',
          equipment: EquipmentType.dumbbell,
          instructions: 'Neutral grip (palms facing each other), curl weights smoothly toward shoulders.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 14.0,
        ),
        const GymExercise(
          id: 'gym_preacher_curl',
          name: 'EZ-Bar Preacher Curl',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Biceps Short Head',
          equipment: EquipmentType.barbell,
          instructions: 'Armpits flush against pad, curl bar to 90 degrees avoiding tension drop-off.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 25.0,
        ),
        const GymExercise(
          id: 'gym_cable_rope_curl',
          name: 'Cable Rope Hammer Curl',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Biceps, Forearms',
          equipment: EquipmentType.cable,
          instructions: 'Spread rope ends at top of curl for peak contraction against constant cable tension.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 25.0,
        ),

        // CHEST
        const GymExercise(
          id: 'gym_bench_press',
          name: 'Barbell Bench Press',
          primaryMuscle: MuscleGroup.chest,
          secondaryMuscle: 'Triceps, Front Delts',
          equipment: EquipmentType.barbell,
          instructions: 'Retract shoulder blades, arch upper back slightly, touch mid-chest and press.',
          defaultSets: 4,
          defaultReps: 8,
          defaultWeightKg: 70.0,
        ),
        const GymExercise(
          id: 'gym_incline_db_press',
          name: 'Incline Dumbbell Press',
          primaryMuscle: MuscleGroup.chest,
          secondaryMuscle: 'Upper Chest, Front Delts',
          equipment: EquipmentType.dumbbell,
          instructions: 'Set bench to 30 degrees. Lower dumbbells with control until deep chest stretch.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 24.0,
        ),
        const GymExercise(
          id: 'gym_decline_bench_press',
          name: 'Decline Barbell Bench Press',
          primaryMuscle: MuscleGroup.chest,
          secondaryMuscle: 'Lower Chest, Triceps',
          equipment: EquipmentType.barbell,
          instructions: 'Secure legs, lower bar to lower sternum, press upward directly over chest.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 65.0,
        ),
        const GymExercise(
          id: 'gym_cable_flyes',
          name: 'Cable Crossover Flyes',
          primaryMuscle: MuscleGroup.chest,
          secondaryMuscle: 'Pectoral Squeeze',
          equipment: EquipmentType.cable,
          instructions: 'Slight elbow bend, bring handles together in an hugging arc, hold squeeze for 1 sec.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 15.0,
        ),
        const GymExercise(
          id: 'gym_chest_dips',
          name: 'Parallel Bar Dips (Chest Focus)',
          primaryMuscle: MuscleGroup.chest,
          secondaryMuscle: 'Triceps, Front Delts',
          equipment: EquipmentType.bodyweight,
          instructions: 'Lean torso forward 30 degrees, flare elbows slightly, lower to 90 degrees and press.',
          defaultSets: 3,
          defaultReps: 8,
          defaultWeightKg: 0.0,
        ),
        const GymExercise(
          id: 'gym_pushups',
          name: 'Standard / Weighted Push-Ups',
          primaryMuscle: MuscleGroup.chest,
          secondaryMuscle: 'Core, Triceps, Delts',
          equipment: EquipmentType.bodyweight,
          instructions: 'Rigid plank line, lower chest to 1 inch above ground, explode upward.',
          defaultSets: 3,
          defaultReps: 15,
          defaultWeightKg: 0.0,
        ),

        // TRICEPS
        const GymExercise(
          id: 'gym_tricep_rope_pushdown',
          name: 'Cable Tricep Rope Pushdown',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Triceps Lateral & Medial Head',
          equipment: EquipmentType.cable,
          instructions: 'Elbows glued to ribs, extend arms downward and spread rope apart at full lockout.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 25.0,
        ),
        const GymExercise(
          id: 'gym_skull_crushers',
          name: 'Lying EZ-Bar Skull Crushers',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Triceps Long Head',
          equipment: EquipmentType.barbell,
          instructions: 'Lower EZ-bar behind forehead bending only at elbows, extend back to vertical.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 28.0,
        ),
        const GymExercise(
          id: 'gym_overhead_db_tricep',
          name: 'Overhead Dumbbell Tricep Extension',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Triceps Long Head',
          equipment: EquipmentType.dumbbell,
          instructions: 'Hold single heavy dumbbell with both hands overhead, lower behind neck and press up.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 22.0,
        ),
        const GymExercise(
          id: 'gym_close_grip_bench',
          name: 'Close-Grip Barbell Bench Press',
          primaryMuscle: MuscleGroup.arms,
          secondaryMuscle: 'Triceps, Inner Chest',
          equipment: EquipmentType.barbell,
          instructions: 'Grip bar shoulder-width, keep elbows tucked close to body throughout press.',
          defaultSets: 3,
          defaultReps: 8,
          defaultWeightKg: 55.0,
        ),

        // CORE & OTHERS (Functional / Grip / Traps)
        const GymExercise(
          id: 'gym_hanging_leg_raises',
          name: 'Hanging Leg Raises',
          primaryMuscle: MuscleGroup.core,
          secondaryMuscle: 'Lower Abs, Hip Flexors, Grip',
          equipment: EquipmentType.bodyweight,
          instructions: 'Hang from pull-up bar, raise straight legs or knees to 90 degrees with posterior pelvic tilt.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 0.0,
        ),
        const GymExercise(
          id: 'gym_cable_woodchops',
          name: 'Cable High-to-Low Woodchops',
          primaryMuscle: MuscleGroup.core,
          secondaryMuscle: 'Obliques, Rotational Core',
          equipment: EquipmentType.cable,
          instructions: 'Rotate through hips and torso, driving cable diagonally across body under control.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeightKg: 18.0,
        ),
        const GymExercise(
          id: 'gym_ab_wheel_rollout',
          name: 'Ab Wheel Rollouts',
          primaryMuscle: MuscleGroup.core,
          secondaryMuscle: 'Anti-Extension Core, Lats',
          equipment: EquipmentType.bodyweight,
          instructions: 'Kneel and roll wheel forward while maintaining hollow body core brace, pull back with abs.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 0.0,
        ),
        const GymExercise(
          id: 'gym_weighted_cable_crunch',
          name: 'Kneeling Cable Crunch',
          primaryMuscle: MuscleGroup.core,
          secondaryMuscle: 'Upper Rectus Abdominis',
          equipment: EquipmentType.cable,
          instructions: 'Hold rope at temples, crunch ribcage down toward pelvis without moving hips.',
          defaultSets: 3,
          defaultReps: 15,
          defaultWeightKg: 35.0,
        ),
        const GymExercise(
          id: 'gym_plank_weighted',
          name: 'Isometric Plank',
          primaryMuscle: MuscleGroup.core,
          secondaryMuscle: 'Transverse Abdominis, Shoulders',
          equipment: EquipmentType.bodyweight,
          instructions: 'Forearms on floor, squeeze glutes and pull navel to spine in solid bridge line.',
          defaultSets: 3,
          defaultReps: 45, // Seconds
          defaultWeightKg: 0.0,
        ),
        const GymExercise(
          id: 'gym_farmers_walk',
          name: 'Heavy Dumbbell Farmer\'s Walks',
          primaryMuscle: MuscleGroup.core,
          secondaryMuscle: 'Grip, Forearms, Upper Traps',
          equipment: EquipmentType.dumbbell,
          instructions: 'Hold heavy dumbbells at sides, stand tall with retracted posture, walk with controlled strides.',
          defaultSets: 3,
          defaultReps: 30, // Paced steps / seconds
          defaultWeightKg: 30.0,
        ),
        const GymExercise(
          id: 'gym_barbell_shrugs',
          name: 'Barbell Trapezius Shrugs',
          primaryMuscle: MuscleGroup.back,
          secondaryMuscle: 'Upper Trapezius, Neck',
          equipment: EquipmentType.barbell,
          instructions: 'Elevate shoulders directly toward ears, hold peak contraction for 1.5 secs, lower smoothly.',
          defaultSets: 4,
          defaultReps: 12,
          defaultWeightKg: 70.0,
        ),

        // SHOULDERS
        const GymExercise(
          id: 'gym_overhead_press',
          name: 'Overhead Barbell Press (OHP)',
          primaryMuscle: MuscleGroup.shoulders,
          secondaryMuscle: 'Triceps, Upper Chest',
          equipment: EquipmentType.barbell,
          instructions: 'Squeeze glutes and core, press vertically past face, lock out overhead.',
          defaultSets: 4,
          defaultReps: 6,
          defaultWeightKg: 45.0,
        ),
        const GymExercise(
          id: 'gym_db_lateral_raise',
          name: 'Dumbbell Lateral Raises',
          primaryMuscle: MuscleGroup.shoulders,
          secondaryMuscle: 'Side Delts',
          equipment: EquipmentType.dumbbell,
          instructions: 'Slight forward lean, raise arms to parallel leading with elbows, control descent.',
          defaultSets: 4,
          defaultReps: 12,
          defaultWeightKg: 10.0,
        ),
        const GymExercise(
          id: 'gym_db_shoulder_press',
          name: 'Seated Dumbbell Shoulder Press',
          primaryMuscle: MuscleGroup.shoulders,
          secondaryMuscle: 'Front & Side Delts, Triceps',
          equipment: EquipmentType.dumbbell,
          instructions: 'Bench upright, press dumbbells upward touching gently overhead, lower to ear level.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeightKg: 20.0,
        ),
        const GymExercise(
          id: 'gym_rear_delt_flyes',
          name: 'Rear Delt Reverse Flyes',
          primaryMuscle: MuscleGroup.shoulders,
          secondaryMuscle: 'Rear Delts, Rhomboids',
          equipment: EquipmentType.dumbbell,
          instructions: 'Hinged torso parallel to floor, raise arms outward squeezing rear shoulders.',
          defaultSets: 3,
          defaultReps: 15,
          defaultWeightKg: 8.0,
        ),
      ];

      for (final ex in defaultGymExercises) {
        await gymExercisesBox.put(ex.id, ex.toMap());
      }
    }

    // 4. Seed 5-Day Customized Workout Split Templates
    // User Split: Rest Mon & Wed | Tue: Legs | Thu: Back & Bis | Fri: Chest & Tris | Sat: Core & Others | Sun: Full Body
    if (gymTemplatesBox.isEmpty || gymTemplatesBox.length < 5) {
      final defaultTemplates = [
        const GymWorkoutTemplate(
          id: 'tpl_split_legs',
          name: 'Day 1 — Legs & Lower Body (Tue)',
          description: 'Quad hypertrophy, heavy squats, Romanian deadlifts, and calves.',
          exerciseIds: [
            'gym_barbell_squat',
            'gym_romanian_deadlift',
            'gym_leg_press',
            'gym_leg_extension',
            'gym_seated_leg_curl',
            'gym_standing_calf_raise',
          ],
          splitCategory: 'Legs',
        ),
        const GymWorkoutTemplate(
          id: 'tpl_split_back_biceps',
          name: 'Day 2 — Back & Biceps (Thu)',
          description: 'Heavy posterior pulling, deadlifts, lat pulldowns, rows, and bicep peaks.',
          exerciseIds: [
            'gym_barbell_deadlift',
            'gym_lat_pulldown',
            'gym_barbell_row',
            'gym_seated_cable_row',
            'gym_standing_barbell_curl',
            'gym_hammer_curls',
            'gym_face_pulls',
          ],
          splitCategory: 'Pull',
        ),
        const GymWorkoutTemplate(
          id: 'tpl_split_chest_triceps',
          name: 'Day 3 — Chest & Triceps (Fri)',
          description: 'Horizontal & incline pressing, cable flyes, dips, and tricep lockout overload.',
          exerciseIds: [
            'gym_bench_press',
            'gym_incline_db_press',
            'gym_cable_flyes',
            'gym_chest_dips',
            'gym_tricep_rope_pushdown',
            'gym_skull_crushers',
          ],
          splitCategory: 'Push',
        ),
        const GymWorkoutTemplate(
          id: 'tpl_split_core_others',
          name: 'Day 4 — Core, Abs & Functional (Sat)',
          description: 'Rotational core power, hanging leg raises, grip strength, and traps.',
          exerciseIds: [
            'gym_hanging_leg_raises',
            'gym_cable_woodchops',
            'gym_ab_wheel_rollout',
            'gym_weighted_cable_crunch',
            'gym_farmers_walk',
            'gym_barbell_shrugs',
            'gym_plank_weighted',
          ],
          splitCategory: 'Core',
        ),
        const GymWorkoutTemplate(
          id: 'tpl_split_full_body',
          name: 'Day 5 — Full Body Hypertrophy (Sun)',
          description: 'Compound power finishing the week: overhead press, pull-ups, squats, and lateral delts.',
          exerciseIds: [
            'gym_overhead_press',
            'gym_pullups',
            'gym_barbell_squat',
            'gym_incline_db_press',
            'gym_db_lateral_raise',
            'gym_romanian_deadlift',
          ],
          splitCategory: 'Full Body',
        ),
      ];

      for (final tpl in defaultTemplates) {
        await gymTemplatesBox.put(tpl.id, tpl.toMap());
      }
    }

    // 5. Seed default User Profile if empty
    if (userProfileBox.isEmpty) {
      const defaultProfile = UserProfile(
        name: 'Athlete',
        age: 26,
        gender: Gender.male,
        heightCm: 178.0,
        weightKg: 72.0,
        activityLevel: ActivityLevel.moderatelyActive,
        goal: FitnessGoal.cut,
        isOnboarded: false,
      );
      await userProfileBox.put(DatabaseKeys.userProfileKey, defaultProfile.toMap());
    }

    // 6. Seed Achievements if empty
    if (achievementsBox.isEmpty) {
      final defaultAchievements = [
        const Achievement(
          id: 'ach_first_workout',
          title: 'First Ascent',
          description: 'Completed your first workout session in Ascend.',
          iconEmoji: '🏔️',
          category: 'Consistency',
          currentProgress: 1,
          maxProgress: 1,
          isUnlocked: true,
        ),
        const Achievement(
          id: 'ach_posture_master',
          title: 'Spine of Steel',
          description: 'Completed 30 posture and mobility sessions.',
          iconEmoji: '🧘',
          category: 'Posture',
          currentProgress: 8,
          maxProgress: 30,
          isUnlocked: false,
        ),
        const Achievement(
          id: 'ach_7_streak',
          title: '7-Day Unbroken Habit',
          description: 'Completed all planned activities for 7 consecutive days.',
          iconEmoji: '🔥',
          category: 'Consistency',
          currentProgress: 4,
          maxProgress: 7,
          isUnlocked: false,
        ),
        const Achievement(
          id: 'ach_first_5k',
          title: '5K Runner',
          description: 'Logged your first 5.0 km cardio running session.',
          iconEmoji: '🏃',
          category: 'Cardio',
          currentProgress: 3,
          maxProgress: 5,
          isUnlocked: false,
        ),
        const Achievement(
          id: 'ach_bench_pr',
          title: 'Iron Mastery',
          description: 'Hit a new Personal Record on a compound barbell lift.',
          iconEmoji: '⚡',
          category: 'Gym',
          currentProgress: 1,
          maxProgress: 1,
          isUnlocked: true,
        ),
        const Achievement(
          id: 'ach_3month_progress',
          title: 'Visual Evolution',
          description: 'Recorded bi-weekly check-in progress photos for 3 months.',
          iconEmoji: '📸',
          category: 'Progress',
          currentProgress: 2,
          maxProgress: 6,
          isUnlocked: false,
        ),
      ];

      for (final ach in defaultAchievements) {
        await achievementsBox.put(ach.id, ach.toMap());
      }
    }

    // 7. Seed starter exercise logs & posture check-ins for rich charts
    if (exerciseLogsBox.isEmpty) {
      final now = DateTime.now();
      final sampleLogs = [
        ExerciseLog(
          id: 'log_seed_1',
          activityId: 'act_chin_tucks',
          activityTitle: 'Chin Tucks',
          category: 'posture',
          timestamp: now.subtract(const Duration(days: 1, hours: 2)),
          setsCompleted: 3,
          repsCompleted: 36,
          caloriesBurned: 35.0,
        ),
        ExerciseLog(
          id: 'log_seed_2',
          activityId: 'act_outdoor_run',
          activityTitle: 'Zone 2 Outdoor Run',
          category: 'cardio',
          timestamp: now.subtract(const Duration(days: 2, hours: 3)),
          setsCompleted: 1,
          durationSeconds: 1500,
          distanceKm: 4.2,
          caloriesBurned: 290.0,
        ),
      ];
      for (final l in sampleLogs) {
        await exerciseLogsBox.put(l.id, l.toMap());
      }
    }

    if (postureCheckinsBox.isEmpty) {
      final now = DateTime.now();
      final checkin = PostureCheckin(
        id: 'chk_seed_1',
        timestamp: now.subtract(const Duration(hours: 3)),
        rating: PostureRating.good,
        note: 'Spine felt aligned during morning desk work.',
      );
      await postureCheckinsBox.put(checkin.id, checkin.toMap());
    }

    if (bodyMetricsBox.isEmpty) {
      final now = DateTime.now();
      final metrics = [
        BodyMetric(
          id: 'metric_1',
          date: now.subtract(const Duration(days: 28)),
          weightKg: 73.5,
          waistCm: 84.0,
          notes: 'Starting baseline',
        ),
        BodyMetric(
          id: 'metric_2',
          date: now.subtract(const Duration(days: 14)),
          weightKg: 72.8,
          waistCm: 82.5,
          notes: 'Waist circumference dropped',
        ),
        BodyMetric(
          id: 'metric_3',
          date: now.subtract(const Duration(days: 2)),
          weightKg: 72.0,
          waistCm: 81.0,
          notes: 'Clean deficit adherence',
        ),
      ];
      for (final m in metrics) {
        await bodyMetricsBox.put(m.id, m.toMap());
      }
    }

    if (gymSessionsBox.isEmpty) {
      final now = DateTime.now();
      final pastSession = GymSession(
        id: 'session_seed_1',
        templateId: 'tpl_push_day',
        templateName: 'Push Day (Chest, Shoulders, Triceps)',
        startTime: now.subtract(const Duration(days: 3, hours: 2)),
        endTime: now.subtract(const Duration(days: 3, hours: 1)),
        sets: [
          const GymSetLog(
            id: 'set_1',
            exerciseId: 'gym_bench_press',
            exerciseName: 'Barbell Bench Press',
            setNumber: 1,
            weightKg: 70.0,
            reps: 8,
            isCompleted: true,
          ),
          const GymSetLog(
            id: 'set_2',
            exerciseId: 'gym_bench_press',
            exerciseName: 'Barbell Bench Press',
            setNumber: 2,
            weightKg: 75.0,
            reps: 6,
            isCompleted: true,
            isPR: true,
          ),
        ],
        totalVolumeKg: 1010.0,
        prsHit: 1,
        caloriesBurned: 320.0,
      );
      await gymSessionsBox.put(pastSession.id, pastSession.toMap());
    }

    if (nutritionEntriesBox.isEmpty) {
      final now = DateTime.now();
      final meals = [
        NutritionEntry(
          id: 'meal_1',
          name: 'Oats, Whey Protein & Berries',
          mealType: MealType.breakfast,
          calories: 420.0,
          proteinGrams: 36.0,
          carbsGrams: 52.0,
          fatGrams: 6.0,
          timestamp: DateTime(now.year, now.month, now.day, 8, 30),
        ),
        NutritionEntry(
          id: 'meal_2',
          name: 'Grilled Chicken, Rice & Avocado',
          mealType: MealType.lunch,
          calories: 650.0,
          proteinGrams: 52.0,
          carbsGrams: 68.0,
          fatGrams: 16.0,
          timestamp: DateTime(now.year, now.month, now.day, 13, 0),
        ),
      ];
      for (final m in meals) {
        await nutritionEntriesBox.put(m.id, m.toMap());
      }
    }
  }

  Future<void> clearAllData() async {
    await activitiesBox.clear();
    await routinesBox.clear();
    await exerciseLogsBox.clear();
    await gymExercisesBox.clear();
    await gymTemplatesBox.clear();
    await gymSessionsBox.clear();
    await nutritionEntriesBox.clear();
    await userProfileBox.clear();
    await progressPhotosBox.clear();
    await bodyMetricsBox.clear();
    await postureCheckinsBox.clear();
    await achievementsBox.clear();
    await dailyNotesBox.clear();
    await waterLogsBox.clear();
    await settingsBox.clear();
    await _seedInitialDataIfEmpty();
  }
}
