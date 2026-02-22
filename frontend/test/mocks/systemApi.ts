import type { Connect } from "vite"
import fs from "fs"
import path from "path"
import {
  getLogContent,
  getLogContentSize,
  getLogContentRange,
  clearLog,
  startLogGrowth,
} from "./logMock"

// Path to the source of truth JSON files (reused from mockApi.ts)
const API_SOURCE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "webserver",
  "opt",
  "webfs",
  "api",
)

// Mock system state for /api/system endpoint
interface SystemState {
  startTime: number
  ssh_status: number // 0 = stopped, 1 = starting, 2 = running
}

// Initialize mock system state
const systemState: SystemState = {
  startTime: Date.now(),
  ssh_status: 2, // Running by default
}

// Mock file system structure
interface MockFileSystemEntry {
  name: string
  isDirectory: boolean
  content?: string | Uint8Array // For files (can be binary)
  children?: MockFileSystemEntry[] // For directories
  size?: number // File size in bytes
  mtime?: number // Modification time in seconds (Unix timestamp)
}

// Helper to generate mtime (seconds since epoch)
const now = Math.floor(Date.now() / 1000)
const oneDayAgo = now - 86400
const oneWeekAgo = now - 604800
const oneMonthAgo = now - 2592000

const mockFileSystem: MockFileSystemEntry = {
  name: "/",
  isDirectory: true,
  children: [
    {
      name: "config",
      isDirectory: true,
      children: [
        {
          name: "printer.cfg",
          isDirectory: false,
          content: "printer_type: kobra2\n",
          mtime: oneWeekAgo,
        },
        {
          name: "settings.json",
          isDirectory: false,
          content: '{"temperature": 200}\n',
          mtime: oneDayAgo,
        },
        {
          name: "profiles",
          isDirectory: true,
          children: [
            {
              name: "default.json",
              isDirectory: false,
              content: '{"profile": "default"}\n',
              mtime: oneMonthAgo,
            },
            {
              name: "high_quality_0.2mm_layer_height_very_detailed_printing_profile_v2.1.json",
              isDirectory: false,
              content: '{"layer_height": 0.2}\n',
              mtime: oneWeekAgo,
            },
            {
              name: "ultra_fine_detailed_high_resolution_printing_configuration_with_extended_settings_and_custom_parameters_for_advanced_users.json",
              isDirectory: false,
              content: '{"advanced": true}\n',
              mtime: oneDayAgo,
            },
          ],
        },
        {
          name: "backups",
          isDirectory: true,
          children: [
            {
              name: "backup_2025-01-15_10-30-45.cfg",
              isDirectory: false,
              content: "backup content\n",
              mtime: oneDayAgo,
            },
            {
              name: "very_long_backup_filename_with_timestamp_and_detailed_description_of_configuration_changes_made_during_printing_session_2025-01-15.cfg",
              isDirectory: false,
              content: "long backup\n",
              mtime: oneWeekAgo,
            },
          ],
        },
      ],
    },
    {
      name: "logs",
      isDirectory: true,
      children: [
        {
          name: "system.log",
          isDirectory: false,
          content: getLogContent(),
          mtime: now - 3600,
        },
        {
          name: "error.log",
          isDirectory: false,
          content: "2025-01-15 10:00:20 [ERROR] Test error\n",
          mtime: now - 7200,
        },
        {
          name: "archive",
          isDirectory: true,
          children: [
            {
              name: "system_2025-01-14.log",
              isDirectory: false,
              content: "archived log\n",
              mtime: oneDayAgo,
            },
            {
              name: "system_2025-01-13.log",
              isDirectory: false,
              content: "older log\n",
              mtime: oneWeekAgo,
            },
            {
              name: "very_long_archived_log_filename_with_complete_timestamp_and_detailed_information_about_the_logging_session_2025-01-12_23-59-59.log",
              isDirectory: false,
              content: "very old log\n",
              size: 150 * 1024,
              mtime: oneMonthAgo,
            },
            {
              name: "large_archive.log",
              isDirectory: false,
              content: "large log file\n",
              size: 300 * 1024,
              mtime: oneWeekAgo,
            },
          ],
        },
      ],
    },
    {
      name: "gcode",
      isDirectory: true,
      children: [
        {
          name: "test.gcode",
          isDirectory: false,
          content: "G28\nG1 X10 Y10\n",
          mtime: oneDayAgo,
        },
        {
          name: "calibration.gcode",
          isDirectory: false,
          content: "G28\nM104 S200\n",
          mtime: oneWeekAgo,
        },
        {
          name: "large_model.gcode",
          isDirectory: false,
          content: "G28\n",
          size: 150 * 1024,
          mtime: oneDayAgo,
        },
        {
          name: "very_long_gcode_filename_that_tests_how_the_file_browser_handles_extremely_long_file_names_with_multiple_words_and_descriptions.gcode",
          isDirectory: false,
          content: "G28\n",
          mtime: oneDayAgo,
        },
        {
          name: "complex_print_job_with_multiple_parts_and_detailed_naming_convention_that_includes_project_name_version_number_and_print_settings_v2.3.1.gcode",
          isDirectory: false,
          content: "G28\nG1 X0 Y0\n",
          size: 250 * 1024,
          mtime: now - 1800,
        },
        {
          name: "projects",
          isDirectory: true,
          children: [
            {
              name: "project1.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "project2.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "complex_projects",
              isDirectory: true,
              children: [
                {
                  name: "multi_part_assembly_project_with_custom_support_structures_and_advanced_printing_parameters.gcode",
                  isDirectory: false,
                  content: "G28\n",
                  size: 500 * 1024,
                  mtime: oneWeekAgo,
                },
                {
                  name: "experimental_design_with_very_long_descriptive_filename_to_test_ui_rendering.gcode",
                  isDirectory: false,
                  content: "G28\n",
                  mtime: oneDayAgo,
                },
                {
                  name: "huge_3d_model_export.gcode",
                  isDirectory: false,
                  content: "G28\n",
                  size: 2 * 1024 * 1024,
                  mtime: oneDayAgo,
                },
              ],
            },
          ],
        },
        {
          name: "test_files",
          isDirectory: true,
          children: [
            {
              name: "test_1.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_2.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_3.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_4.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_5.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_6.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_7.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_8.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_9.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_10.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_11.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_12.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_13.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_14.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_15.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_16.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_17.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_18.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "test_19.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneDayAgo,
            },
            {
              name: "test_20.gcode",
              isDirectory: false,
              content: "G28\n",
              mtime: oneWeekAgo,
            },
            {
              name: "large_test_file.gcode",
              isDirectory: false,
              content: "G28\n",
              size: 120 * 1024,
              mtime: oneDayAgo,
            },
            {
              name: "calibration_test.gcode",
              isDirectory: false,
              content: "G28\nM104 S200\n",
              mtime: oneDayAgo,
            },
            {
              name: "bed_leveling.gcode",
              isDirectory: false,
              content: "G28\nG29\n",
              mtime: oneWeekAgo,
            },
            {
              name: "temperature_test.gcode",
              isDirectory: false,
              content: "M104 S200\nM140 S60\n",
              mtime: oneDayAgo,
            },
            {
              name: "extruder_test.gcode",
              isDirectory: false,
              content: "G1 E10 F100\n",
              mtime: oneWeekAgo,
            },
            {
              name: "fan_test.gcode",
              isDirectory: false,
              content: "M106 S255\n",
              mtime: oneDayAgo,
            },
            {
              name: "movement_test.gcode",
              isDirectory: false,
              content: "G1 X10 Y10 Z10\n",
              mtime: oneWeekAgo,
            },
            {
              name: "retraction_test.gcode",
              isDirectory: false,
              content: "G1 E-5 F100\n",
              mtime: oneDayAgo,
            },
            {
              name: "speed_test.gcode",
              isDirectory: false,
              content: "G1 X100 F3000\n",
              mtime: oneWeekAgo,
            },
            {
              name: "layer_test.gcode",
              isDirectory: false,
              content: "G1 Z0.2\n",
              mtime: oneDayAgo,
            },
            {
              name: "final_test.gcode",
              isDirectory: false,
              content: "G28\nM84\n",
              mtime: oneWeekAgo,
            },
          ],
        },
      ],
    },
    {
      name: "readme.txt",
      isDirectory: false,
      content: "System readme file\n",
      mtime: oneMonthAgo,
    },
    {
      name: "scripts",
      isDirectory: true,
      children: [
        {
          name: "long_example.py",
          isDirectory: false,
          content: `#!/usr/bin/env python3
"""\nThis is a very long Python script designed to test the file viewer's handling of long lines and large files.\nIt contains various examples of code with extremely long lines that exceed 150 characters to test horizontal scrolling.\n"""

import os
import sys
import json
import time
import threading
import subprocess
from typing import Dict, List, Optional, Tuple, Any, Union, Set, Callable, Iterator, Generator
from dataclasses import dataclass, field
from pathlib import Path

# This is an extremely long comment line that goes on and on and on to test how the editor handles horizontal scrolling with very long lines of text that exceed the normal viewing width

@dataclass
class VeryLongClassName WithMultipleWordsAndDescriptiveNamingConventionThatExceedsNormalLineLengthToTestHorizontalScrollingCapabilities:
    """A class with a ridiculously long name to test horizontal scrolling."""
    very_long_parameter_name_that_describes_something_important: str = "default_value_that_is_also_quite_long_to_make_the_line_even_longer"
    another_extremely_long_parameter_name_for_testing_purposes: int = 12345678901234567890
    yet_another_parameter_with_a_descriptive_but_unnecessarily_long_name: float = 3.14159265358979323846264338327950288419716939937510
    list_of_items_with_very_long_strings: List[str] = field(default_factory=lambda: ["item_1_with_long_name", "item_2_with_long_name", "item_3_with_long_name"])

class ConfigurationManager:
    """Manages configuration with very long method names and parameters."""
    
    def __init__(self, configuration_file_path: str, enable_verbose_logging: bool = False, maximum_retry_attempts: int = 3, connection_timeout_in_seconds: int = 30):
        self.configuration_file_path = configuration_file_path
        self.enable_verbose_logging = enable_verbose_logging
        self.maximum_retry_attempts = maximum_retry_attempts
        self.connection_timeout_in_seconds = connection_timeout_in_seconds
        
    def load_configuration_from_json_file_with_error_handling_and_validation(self, validate_schema: bool = True, apply_defaults: bool = True) -> Dict[str, Any]:
        """Load configuration with an unnecessarily long method name to test horizontal scrolling in the editor."""
        try:
            with open(self.configuration_file_path, 'r', encoding='utf-8') as configuration_file_handle:
                configuration_data = json.load(configuration_file_handle)
                if validate_schema:
                    self._validate_configuration_schema_against_predefined_rules_and_constraints(configuration_data)
                if apply_defaults:
                    configuration_data = self._apply_default_values_to_missing_configuration_parameters(configuration_data)
                return configuration_data
        except FileNotFoundError as file_not_found_exception:
            print(f"ERROR: Configuration file not found at path: {self.configuration_file_path}. Please check the file path and try again. Exception details: {str(file_not_found_exception)}")
            raise
        except json.JSONDecodeError as json_decode_exception:
            print(f"ERROR: Failed to parse JSON configuration file. The file may be corrupted or contain invalid JSON syntax. Exception details: {str(json_decode_exception)}")
            raise
            
    def _validate_configuration_schema_against_predefined_rules_and_constraints(self, configuration_data: Dict[str, Any]) -> bool:
        """Validate configuration with very long variable names."""
        required_configuration_keys = ['database_connection_string', 'api_endpoint_url', 'authentication_token', 'maximum_concurrent_connections', 'request_timeout_milliseconds']
        
        for required_configuration_key_name in required_configuration_keys:
            if required_configuration_key_name not in configuration_data:
                raise ValueError(f"Missing required configuration key: {required_configuration_key_name}. Please ensure all required configuration parameters are present in the configuration file.")
                
        return True
        
    def _apply_default_values_to_missing_configuration_parameters(self, configuration_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply defaults with long dictionary keys and values."""
        default_configuration_values = {
            'enable_debug_mode': False,
            'log_level': 'INFO',
            'maximum_log_file_size_in_megabytes': 100,
            'log_file_rotation_count': 5,
            'enable_performance_monitoring': True,
            'performance_monitoring_interval_seconds': 60,
            'enable_automatic_error_reporting': False,
            'error_reporting_endpoint_url': 'https://errors.example.com/api/v1/reports',
            'connection_pool_size': 10,
            'connection_pool_timeout_seconds': 30,
            'enable_connection_pool_recycling': True,
            'connection_pool_recycle_interval_seconds': 3600
        }
        
        for default_configuration_key, default_configuration_value in default_configuration_values.items():
            if default_configuration_key not in configuration_data:
                configuration_data[default_configuration_key] = default_configuration_value
                if self.enable_verbose_logging:
                    print(f"Applied default value '{default_configuration_value}' for configuration key '{default_configuration_key}' because it was not present in the configuration file.")
                    
        return configuration_data

class DataProcessingPipeline:
    """Data processing with long lines."""
    
    def process_large_dataset_with_multiple_transformations_and_aggregations(self, input_data: List[Dict[str, Any]], apply_filtering: bool = True, apply_transformation: bool = True, apply_aggregation: bool = True) -> List[Dict[str, Any]]:
        """Process data with very long conditional statements."""
        processed_data_results = []
        
        for data_item_index, data_item in enumerate(input_data):
            # This is a very long condition that checks multiple criteria to test how the editor handles long conditional expressions with many boolean operators
            if apply_filtering and 'status' in data_item and data_item['status'] == 'active' and 'priority' in data_item and data_item['priority'] > 5 and 'created_at' in data_item and self._is_timestamp_within_last_30_days(data_item['created_at']):
                if apply_transformation:
                    transformed_data_item = self._apply_complex_transformation_with_multiple_steps_and_calculations(data_item)
                else:
                    transformed_data_item = data_item
                    
                processed_data_results.append(transformed_data_item)
                
                if self.enable_verbose_logging:
                    print(f"Processed data item {data_item_index + 1}/{len(input_data)}: status={data_item.get('status')}, priority={data_item.get('priority')}, created_at={data_item.get('created_at')}")
                    
        if apply_aggregation:
            aggregated_results = self._aggregate_processed_data_by_category_and_compute_statistics(processed_data_results)
            return aggregated_results
        else:
            return processed_data_results
            
    def _is_timestamp_within_last_30_days(self, timestamp: int) -> bool:
        """Check if timestamp is recent."""
        current_timestamp = int(time.time())
        thirty_days_in_seconds = 30 * 24 * 60 * 60
        return (current_timestamp - timestamp) <= thirty_days_in_seconds
        
    def _apply_complex_transformation_with_multiple_steps_and_calculations(self, data_item: Dict[str, Any]) -> Dict[str, Any]:
        """Transform data item with complex calculations."""
        transformed_item = data_item.copy()
        
        # Apply multiple transformations
        if 'value' in transformed_item:
            transformed_item['normalized_value'] = (transformed_item['value'] - self.minimum_value) / (self.maximum_value - self.minimum_value) if self.maximum_value != self.minimum_value else 0
            transformed_item['logarithmic_value'] = math.log(transformed_item['value'] + 1) if transformed_item['value'] >= 0 else 0
            transformed_item['exponential_value'] = math.exp(min(transformed_item['value'], 10)) if transformed_item['value'] <= 10 else math.exp(10)
            
        return transformed_item
        
    def _aggregate_processed_data_by_category_and_compute_statistics(self, processed_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Aggregate data with statistical computations."""
        aggregated_results_by_category = {}
        
        for data_item in processed_data:
            category = data_item.get('category', 'uncategorized')
            if category not in aggregated_results_by_category:
                aggregated_results_by_category[category] = {'count': 0, 'total_value': 0, 'items': []}
                
            aggregated_results_by_category[category]['count'] += 1
            aggregated_results_by_category[category]['total_value'] += data_item.get('value', 0)
            aggregated_results_by_category[category]['items'].append(data_item)
            
        return [{'category': category, 'statistics': stats} for category, stats in aggregated_results_by_category.items()]

def execute_complex_database_query_with_multiple_joins_and_filters(connection_string: str, table_name: str, filter_conditions: Dict[str, Any], join_tables: List[str], order_by_columns: List[str]) -> List[Dict[str, Any]]:
    """Execute database query with very long SQL statements."""
    sql_query = f"SELECT * FROM {table_name} WHERE {' AND '.join([f'{key} = {value}' for key, value in filter_conditions.items()])} ORDER BY {', '.join(order_by_columns)}"
    print(f"Executing SQL query: {sql_query}")
    # Simulated query execution
    return []

def generate_comprehensive_report_with_multiple_sections_and_detailed_analysis(data: List[Dict[str, Any]], include_charts: bool = True, include_statistics: bool = True, export_format: str = 'pdf') -> str:
    """Generate report with very long string formatting."""
    report_header = f"=" * 150 + "\n" + f"COMPREHENSIVE DATA ANALYSIS REPORT - Generated on {time.strftime('%Y-%m-%d %H:%M:%S')}" + "\n" + f"=" * 150 + "\n"
    report_content = report_header
    
    report_content += f"\nTotal number of data items analyzed: {len(data)}\n"
    report_content += f"Report includes charts: {include_charts}, includes statistics: {include_statistics}, export format: {export_format}\n"
    report_content += "\n" + "-" * 150 + "\n"
    
    return report_content

if __name__ == "__main__":
    print("Starting very long example script with extensive logging and detailed output messages that exceed normal line lengths for testing purposes")
    
    configuration_manager_instance = ConfigurationManager(
        configuration_file_path="/path/to/configuration/file/that/has/a/very/long/path/name/to/test/horizontal/scrolling.json",
        enable_verbose_logging=True,
        maximum_retry_attempts=5,
        connection_timeout_in_seconds=60
    )
    
    print("Application initialized successfully with all configuration parameters loaded and validated against the predefined schema and business rules")
`,
          mtime: oneDayAgo,
        },
      ],
    },
    {
      name: "firmware",
      isDirectory: true,
      children: [
        {
          name: "bootloader.bin",
          isDirectory: false,
          // ELF binary header
          content: new Uint8Array([
            0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x3e, 0x00, 0x01, 0x00,
            0x00, 0x00, 0x50, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x38,
            0x00, 0x09, 0x00, 0x40, 0x00, 0x1c, 0x00, 0x1b, 0x00, 0x06, 0x00,
            0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x40, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00,
          ]),
          mtime: oneMonthAgo,
        },
        {
          name: "image.png",
          isDirectory: false,
          // PNG header
          content: new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
            0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00,
            0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00,
          ]),
          mtime: oneWeekAgo,
        },
        {
          name: "firmware.hex",
          isDirectory: false,
          content:
            ":100000000C9434000C9451000C9451000C945100EC\n:100010000C9451000C9451000C9451000C94510098\n",
          mtime: oneDayAgo,
        },
      ],
    },
    {
      name: "very_long_readme_filename_that_tests_file_browser_display_capabilities_with_extended_descriptive_text.txt",
      isDirectory: false,
      content: "Long filename readme\n",
      mtime: oneWeekAgo,
    },
  ],
}

// Find file system entry by path
function findFileSystemEntry(
  pathSegments: string[],
): MockFileSystemEntry | null {
  let current: MockFileSystemEntry = mockFileSystem
  for (const segment of pathSegments) {
    if (!segment || segment === "") continue
    if (!current.children) return null
    const found = current.children.find((child) => child.name === segment)
    if (!found) return null
    current = found
  }
  return current
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

// Generate dynamic system info for /api/system endpoint
function getDynamicSystemInfo(): string {
  // Calculate dynamic uptime
  const elapsed = Math.floor((Date.now() - systemState.startTime) / 1000)
  const uptime = formatUptime(elapsed)

  // Simulate CPU and memory fluctuations
  const cpu_use = 40 + Math.floor(Math.random() * 40)
  const cpu_usr_use = Math.floor(cpu_use * 0.5)
  const cpu_sys_use = cpu_use - cpu_usr_use
  const cpu_idle = 100 - cpu_use

  // Simulate memory changes
  const total_mem = 114208768
  const memVariation = Math.floor(Math.random() * 10) - 5
  const free_mem = Math.max(
    30000000,
    Math.min(total_mem, 43442176 + memVariation * 1024 * 1024),
  )
  const free_mem_per = Math.floor((free_mem / total_mem) * 100)

  // Return system info
  return JSON.stringify({
    api_ver: 1,
    total_mem,
    free_mem,
    free_mem_per,
    cpu_use,
    cpu_usr_use,
    cpu_sys_use,
    cpu_idle,
    ssh_status: systemState.ssh_status,
    uptime,
  })
}

export function createSystemApiMiddleware(): Connect.NextHandleFunction {
  // Start log growth simulation when middleware is created (not at module load)
  startLogGrowth()

  return (req, res, next) => {
    const url = new URL(req.url!, `http://${req.headers.host}`)

    // Handle /api/system - system information endpoint
    if (req.method === "GET" && url.pathname === "/api/system") {
      res.setHeader("Content-Type", "application/json")
      res.statusCode = 200
      res.end(getDynamicSystemInfo())
      return
    }

    // Handle POST /api/system/reboot
    if (req.method === "POST" && url.pathname === "/api/system/reboot") {
      console.log("[System Mock] Reboot requested (new API)")
      systemState.startTime = Date.now()
      res.setHeader("Content-Type", "application/json")
      res.statusCode = 200
      res.end(
        JSON.stringify({ status: "success", message: "System is rebooting" }),
      )
      return
    }

    // Handle POST /api/system/poweroff
    if (req.method === "POST" && url.pathname === "/api/system/poweroff") {
      console.log("[System Mock] Poweroff requested (new API)")
      res.setHeader("Content-Type", "application/json")
      res.statusCode = 200
      res.end(
        JSON.stringify({
          status: "success",
          message: "System is shutting down",
        }),
      )
      return
    }

    // Handle POST /api/system/ssh
    if (req.method === "POST" && url.pathname === "/api/system/ssh") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })
      req.on("end", () => {
        try {
          const { action } = JSON.parse(body)
          res.setHeader("Content-Type", "application/json")

          if (action === "start") {
            console.log("[System Mock] SSH start requested (new API)")
            systemState.ssh_status = 2
            res.statusCode = 200
            res.end(
              JSON.stringify({
                status: "success",
                message: "SSH service started",
              }),
            )
          } else if (action === "stop") {
            console.log("[System Mock] SSH stop requested (new API)")
            systemState.ssh_status = 0
            res.statusCode = 200
            res.end(
              JSON.stringify({
                status: "success",
                message: "SSH service stopped",
              }),
            )
          } else if (action === "restart") {
            console.log("[System Mock] SSH restart requested (new API)")
            systemState.ssh_status = 1
            setTimeout(() => {
              systemState.ssh_status = 2
            }, 1000)
            res.statusCode = 200
            res.end(
              JSON.stringify({
                status: "success",
                message: "SSH service restarted",
              }),
            )
          } else {
            res.statusCode = 400
            res.end(
              JSON.stringify({
                status: "error",
                message: "Invalid action. Use 'start', 'stop', or 'restart'.",
              }),
            )
          }
        } catch (error) {
          res.statusCode = 400
          res.end(
            JSON.stringify({
              status: "error",
              message: "Invalid JSON payload",
            }),
          )
        }
      })
      return
    }

    // Handle POST /api/system/log/clear
    if (req.method === "POST" && url.pathname === "/api/system/log/clear") {
      console.log("[System Mock] Log clear requested (new API)")
      clearLog()
      res.setHeader("Content-Type", "application/json")
      res.statusCode = 200
      res.end(JSON.stringify({ status: "success", message: "Log cleared" }))
      return
    }

    // Handle POST /api/security/password - Change root password
    if (req.method === "POST" && url.pathname === "/api/security/password") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })
      req.on("end", () => {
        try {
          const { password } = JSON.parse(body)
          res.setHeader("Content-Type", "application/json")

          if (password && password.length >= 1) {
            console.log("[System Mock] Root password changed (mock)")
            res.statusCode = 200
            res.end(
              JSON.stringify({
                status: "success",
                message: "Password changed successfully",
              }),
            )
          } else {
            res.statusCode = 400
            res.end(
              JSON.stringify({
                status: "error",
                message: "Password must be at least 1 character",
              }),
            )
          }
        } catch (error) {
          res.statusCode = 400
          res.end(
            JSON.stringify({
              status: "error",
              message: "Invalid JSON payload",
            }),
          )
        }
      })
      return
    }

    // Handle /files/log with HEAD, Range request support
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname === "/files/log"
    ) {
      const rangeHeader =
        req.headers["range"] || req.headers["Range"] || req.headers["RANGE"]
      const logContent = getLogContent()
      const logSize = getLogContentSize()

      // Handle HEAD request
      if (req.method === "HEAD") {
        res.setHeader("Content-Type", "text/plain")
        res.setHeader("Content-Length", logSize.toString())
        res.setHeader("Accept-Ranges", "bytes")
        res.statusCode = 200
        res.end()
        return
      }

      // Parse Range header if present
      if (
        rangeHeader &&
        typeof rangeHeader === "string" &&
        rangeHeader.startsWith("bytes=")
      ) {
        const rangeValue = rangeHeader.substring(6) // Remove "bytes="
        const rangeMatch = rangeValue.match(/^(\d+)-$/) // Match "start-" format

        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10)

          // Check if range is valid
          if (start >= 0 && start < logSize) {
            const rangeContent = getLogContentRange(start)
            const rangeSize = Buffer.byteLength(rangeContent, "utf8")
            const end = start + rangeSize - 1

            res.setHeader("Content-Type", "text/plain")
            res.setHeader("Content-Range", `bytes ${start}-${end}/${logSize}`)
            res.setHeader("Accept-Ranges", "bytes")
            res.statusCode = 206 // Partial Content
            res.end(rangeContent)
            return
          } else if (start >= logSize) {
            // Range Not Satisfiable
            res.setHeader("Content-Range", `bytes */${logSize}`)
            res.statusCode = 416
            res.end("Range Not Satisfiable")
            return
          }
        }
      }

      // Full content response (no Range header or invalid range)
      res.setHeader("Content-Type", "text/plain")
      res.setHeader("Accept-Ranges", "bytes")
      res.statusCode = 200
      res.end(logContent)
      return
    }

    // Handle file browser - serve as JSON API for easier development
    if (
      req.method === "GET" &&
      url.pathname.startsWith("/files/") &&
      url.pathname !== "/files/log"
    ) {
      const filePath = url.pathname.substring("/files/".length)
      const pathSegments = filePath.split("/").filter((p) => p)
      const entry = findFileSystemEntry(pathSegments)

      if (entry) {
        if (entry.isDirectory) {
          // Serve directory listing as JSON
          const children = (entry.children || []).map((child) => {
            const result: any = {
              name: child.name,
              isDirectory: child.isDirectory,
            }
            if (!child.isDirectory) {
              // Calculate size from content if not set
              if (child.size !== undefined) {
                result.size = child.size
              } else if (child.content) {
                result.size = Buffer.byteLength(child.content, "utf8")
              }
              // Include mtime if set
              if (child.mtime !== undefined) {
                result.mtime = child.mtime
              }
            }
            return result
          })
          res.setHeader("Content-Type", "application/json")
          res.statusCode = 200
          res.end(JSON.stringify(children))
          return
        } else {
          // Serve file content
          const content = entry.content || ""
          if (content instanceof Uint8Array) {
            // Binary content
            res.setHeader("Content-Type", "application/octet-stream")
            res.statusCode = 200
            res.end(Buffer.from(content))
          } else {
            // Text content
            res.setHeader("Content-Type", "text/plain")
            res.statusCode = 200
            res.end(content)
          }
          return
        }
      } else {
        res.statusCode = 404
        res.end("Not found")
        return
      }
    }

    // Handle root directory listing for file browser
    if (req.method === "GET" && url.pathname === "/") {
      // Check if it's a file browser request (could check Accept header or query param)
      // For now, let it pass through to SvelteKit
      next()
      return
    }

    next()
  }
}
