package com.example.zeroops.util; // Or your preferred utility package

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class FileUtils {

    public static List<File> getAllFiles(File folder) {
        List<File> files = new ArrayList<>();
        if (folder == null || !folder.isDirectory()) {
            return files; // Return empty list if folder is null or not a directory
        }

        File[] entries = folder.listFiles();

        if (entries != null) {
            for (File entry : entries) {
                if (entry.isDirectory()) {
                    files.addAll(getAllFiles(entry)); // Recursive call for subdirectories
                } else {
                    files.add(entry); // Add file
                }
            }
        }
        return files;
    }
}