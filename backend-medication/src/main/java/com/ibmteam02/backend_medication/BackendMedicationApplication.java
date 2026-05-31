package com.ibmteam02.backend_medication;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BackendMedicationApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendMedicationApplication.class, args);
	}

}
