import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/features/gym/presentation/gym_home_screen.dart';
import 'package:ascend/features/nutrition/presentation/nutrition_screen.dart';
import 'package:ascend/features/progress/presentation/progress_screen.dart';
import 'package:ascend/features/reports/presentation/weekly_report_screen.dart';
import 'package:ascend/features/today/presentation/today_screen.dart';

final navigationIndexProvider = StateProvider<int>((ref) => 0);

class MainNavigationScreen extends ConsumerWidget {
  const MainNavigationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(navigationIndexProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final pages = const [
      TodayScreen(),
      GymHomeScreen(),
      NutritionScreen(),
      ProgressScreen(),
      WeeklyReportScreen(),
    ];

    final activeColors = [
      AppColors.primaryTeal,
      AppColors.gymCoral,
      AppColors.nutritionAmber,
      AppColors.progressIndigo,
      AppColors.successMint,
    ];

    return Scaffold(
      body: IndexedStack(
        index: currentIndex,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          ref.read(navigationIndexProvider.notifier).state = index;
        },
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        indicatorColor: activeColors[currentIndex].withAlpha(isDark ? 50 : 35),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.today_outlined),
            selectedIcon: Icon(Icons.today, color: activeColors[0]),
            label: 'Today',
          ),
          NavigationDestination(
            icon: const Icon(Icons.fitness_center_outlined),
            selectedIcon: Icon(Icons.fitness_center, color: activeColors[1]),
            label: 'Gym',
          ),
          NavigationDestination(
            icon: const Icon(Icons.restaurant_menu_outlined),
            selectedIcon: Icon(Icons.restaurant_menu, color: activeColors[2]),
            label: 'Nutrition',
          ),
          NavigationDestination(
            icon: const Icon(Icons.photo_library_outlined),
            selectedIcon: Icon(Icons.photo_library, color: activeColors[3]),
            label: 'Progress',
          ),
          NavigationDestination(
            icon: const Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights, color: activeColors[4]),
            label: 'Reports',
          ),
        ],
      ),
    );
  }
}
