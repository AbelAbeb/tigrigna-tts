plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.abelabeb.tigrignatts"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.abelabeb.tigrignatts"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        // Backend the app talks to. Swap this once the Render deploy is live
        // (see ../README.md "Deploying" section for how to get the URL).
        buildConfigField("String", "BASE_URL", "\"https://tigrigna-tts.onrender.com\"")
    }

    buildTypes {
        debug {
            // Points at the phone's own localhost. Pair with
            // `adb reverse tcp:5000 tcp:5000` so a USB-connected device's
            // localhost:5000 tunnels back to the dev machine's Flask server
            // - works regardless of WiFi/LAN/firewall setup.
            buildConfigField("String", "BASE_URL", "\"http://127.0.0.1:5000\"")
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("com.google.android.material:material:1.12.0")
}
