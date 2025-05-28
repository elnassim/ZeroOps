// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\test\java\com\example\zeroops\ZeroopsApplicationTests.java
package com.example.zeroops;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource; // <--- IMPORT THIS

@SpringBootTest
@TestPropertySource(locations = "classpath:application.properties") // <--- ADD THIS LINE
class ZeroopsApplicationTests {

    @Test
    void contextLoads() {
        // This test will now run with properties loaded from src/main/resources/application.properties
    }

}