// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\strategy\DeploymentStrategyFactory.java
package com.example.zeroops.strategy;

import com.example.zeroops.strategy.impl.BlueGreenStrategy;
import com.example.zeroops.strategy.impl.DefaultDeployStrategy;
import com.example.zeroops.strategy.impl.RollingUpdateStrategy;

public class DeploymentStrategyFactory {

    public static DeploymentStrategy getStrategy(String strategyType) {
        if (strategyType == null) {
            return new DefaultDeployStrategy();
        }
        switch (strategyType.toLowerCase()) {
            case "rolling":
                return new RollingUpdateStrategy();
            case "bluegreen":
                return new BlueGreenStrategy();
            case "default":
            default:
                return new DefaultDeployStrategy();
        }
    }
}