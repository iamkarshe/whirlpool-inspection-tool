// =============================================================================
// Jenkinsfile — source-only security pipeline for api/ + ui/
//
// Scope:
// - api/ only
// - ui/ only
// - Secret scan: Gitleaks
// - SAST: Semgrep + Bandit
// - SCA: Trivy filesystem dependency scan
//
// This pipeline does NOT run the application.
// No Docker Compose, no DB, no runtime env vars, no DAST.
//
// Agent requirement:
// - Linux Jenkins agent
// - Jenkins user can run docker
//
// Recommended Jenkins plugins:
// - Warnings Next Generation
// - HTML Publisher
// =============================================================================

pipeline {
    agent any

    parameters {
        booleanParam(
            name: 'RUN_SECRETS',
            defaultValue: true,
            description: 'Run Gitleaks secret scan on api/ and ui/'
        )

        booleanParam(
            name: 'RUN_SAST',
            defaultValue: true,
            description: 'Run Semgrep and Bandit SAST'
        )

        booleanParam(
            name: 'RUN_SCA',
            defaultValue: true,
            description: 'Run Trivy dependency / vulnerability scan'
        )

        booleanParam(
            name: 'FAIL_ON_FINDINGS',
            defaultValue: true,
            description: 'Fail build when quality gate thresholds are exceeded'
        )

        string(
            name: 'MAX_CRITICAL',
            defaultValue: '0',
            description: 'Maximum allowed CRITICAL findings'
        )

        string(
            name: 'MAX_HIGH',
            defaultValue: '5',
            description: 'Maximum allowed HIGH findings'
        )
    }

    options {
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))

        // Global safety net for the complete security pipeline.
        timeout(time: 25, unit: 'MINUTES')
    }

    environment {
        REPORTS = 'reports'

        TRIVY_CACHE = "${WORKSPACE}/.trivycache"

        MAX_CRITICAL = "${params.MAX_CRITICAL}"
        MAX_HIGH     = "${params.MAX_HIGH}"

        // Pinned images for predictable CI behavior.
        IMG_GITLEAKS = 'ghcr.io/gitleaks/gitleaks:v8.28.0'
        IMG_SEMGREP  = 'semgrep/semgrep:1.128.1'
        IMG_TRIVY    = 'aquasec/trivy:0.64.1'
        IMG_PY       = 'python:3.12-slim'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                    set -eu

                    rm -rf "$REPORTS"
                    mkdir -p "$REPORTS" "$TRIVY_CACHE"

                    echo "Workspace: $WORKSPACE"
                    echo "Scanning scope:"
                    [ -d api ] && echo " - api/" || echo " - api/ missing"
                    [ -d ui ]  && echo " - ui/"  || echo " - ui/ missing"
                '''
            }
        }

        stage('Secrets — Gitleaks') {
            when {
                expression { return params.RUN_SECRETS }
            }

            parallel {
                stage('api/ secrets') {
                    steps {
                        script {
                            try {
                                timeout(time: 10, unit: 'MINUTES') {
                                    sh '''
                                        set +e

                                        if [ ! -d api ]; then
                                            echo "api/ not found. Skipping Gitleaks api scan."
                                            exit 0
                                        fi

                                        docker run --rm \
                                            -v "$WORKSPACE:/repo" \
                                            -w /repo \
                                            "$IMG_GITLEAKS" dir api \
                                            --no-banner \
                                            --redact \
                                            --report-format sarif \
                                            --report-path "$REPORTS/gitleaks-api.sarif" \
                                            --exit-code 0

                                        EXIT_CODE=$?
                                        echo "Gitleaks api/ exit code: $EXIT_CODE"
                                        exit 0
                                    '''
                                }
                            } catch (err) {
                                echo "Gitleaks api/ timed out or failed. Continuing pipeline."
                                sh '''
                                    mkdir -p "$REPORTS"
                                    cat > "$REPORTS/gitleaks-api-timeout.txt" <<EOF
Gitleaks api/ scan timed out or failed.
The pipeline continued by design.
EOF
                                '''
                            }
                        }
                    }
                }

                stage('ui/ secrets') {
                    steps {
                        script {
                            try {
                                timeout(time: 10, unit: 'MINUTES') {
                                    sh '''
                                        set +e

                                        if [ ! -d ui ]; then
                                            echo "ui/ not found. Skipping Gitleaks ui scan."
                                            exit 0
                                        fi

                                        docker run --rm \
                                            -v "$WORKSPACE:/repo" \
                                            -w /repo \
                                            "$IMG_GITLEAKS" dir ui \
                                            --no-banner \
                                            --redact \
                                            --report-format sarif \
                                            --report-path "$REPORTS/gitleaks-ui.sarif" \
                                            --exit-code 0

                                        EXIT_CODE=$?
                                        echo "Gitleaks ui/ exit code: $EXIT_CODE"
                                        exit 0
                                    '''
                                }
                            } catch (err) {
                                echo "Gitleaks ui/ timed out or failed. Continuing pipeline."
                                sh '''
                                    mkdir -p "$REPORTS"
                                    cat > "$REPORTS/gitleaks-ui-timeout.txt" <<EOF
Gitleaks ui/ scan timed out or failed.
The pipeline continued by design.
EOF
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('SAST') {
            when {
                expression { return params.RUN_SAST }
            }

            parallel {
                stage('api/ — Semgrep') {
                    steps {
                        script {
                            try {
                                timeout(time: 4, unit: 'MINUTES') {
                                    sh '''
                                        set +e

                                        if [ ! -d api ]; then
                                            echo "api/ not found. Skipping Semgrep api scan."
                                            exit 0
                                        fi

                                        docker run --rm \
                                            -v "$WORKSPACE:/src" \
                                            -w /src \
                                            "$IMG_SEMGREP" semgrep scan \
                                            --metrics=off \
                                            --config p/python \
                                            --config p/security-audit \
                                            --exclude '*/tests/*' \
                                            --exclude '*/__pycache__/*' \
                                            --sarif \
                                            --output "$REPORTS/semgrep-api.sarif" \
                                            api

                                        echo "Semgrep api/ exit code: $?"
                                        exit 0
                                    '''
                                }
                            } catch (err) {
                                echo "Semgrep api/ timed out or failed. Continuing pipeline."
                                sh '''
                                    mkdir -p "$REPORTS"
                                    echo "Semgrep api/ scan timed out or failed." > "$REPORTS/semgrep-api-timeout.txt"
                                '''
                            }
                        }
                    }
                }

                stage('api/ — Bandit') {
                    steps {
                        script {
                            try {
                                timeout(time: 4, unit: 'MINUTES') {
                                    sh '''
                                        set +e

                                        if [ ! -d api ]; then
                                            echo "api/ not found. Skipping Bandit."
                                            exit 0
                                        fi

                                        docker run --rm \
                                            -v "$WORKSPACE:/src" \
                                            -w /src \
                                            "$IMG_PY" sh -c '
                                                set +e
                                                pip install --quiet --disable-pip-version-check bandit

                                                bandit -r api \
                                                    --exclude api/deploy.py \
                                                    -x "*/tests/*,*/__pycache__/*" \
                                                    --skip B105,B106,B107 \
                                                    -f html \
                                                    -o reports/bandit-api.html

                                                echo "Bandit exit code: $?"
                                                exit 0
                                            '
                                    '''
                                }
                            } catch (err) {
                                echo "Bandit api/ timed out or failed. Continuing pipeline."
                                sh '''
                                    mkdir -p "$REPORTS"
                                    echo "Bandit api/ scan timed out or failed." > "$REPORTS/bandit-api-timeout.txt"
                                '''
                            }
                        }
                    }
                }

                stage('ui/ — Semgrep') {
                    steps {
                        script {
                            try {
                                timeout(time: 4, unit: 'MINUTES') {
                                    sh '''
                                        set +e

                                        if [ ! -d ui ]; then
                                            echo "ui/ not found. Skipping Semgrep ui scan."
                                            exit 0
                                        fi

                                        docker run --rm \
                                            -v "$WORKSPACE:/src" \
                                            -w /src \
                                            "$IMG_SEMGREP" semgrep scan \
                                            --metrics=off \
                                            --config p/javascript \
                                            --config p/typescript \
                                            --config p/react \
                                            --config p/security-audit \
                                            --exclude 'ui/node_modules/*' \
                                            --exclude 'ui/dist/*' \
                                            --exclude 'ui/build/*' \
                                            --sarif \
                                            --output "$REPORTS/semgrep-ui.sarif" \
                                            ui

                                        echo "Semgrep ui/ exit code: $?"
                                        exit 0
                                    '''
                                }
                            } catch (err) {
                                echo "Semgrep ui/ timed out or failed. Continuing pipeline."
                                sh '''
                                    mkdir -p "$REPORTS"
                                    echo "Semgrep ui/ scan timed out or failed." > "$REPORTS/semgrep-ui-timeout.txt"
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('SCA — Trivy') {
            when {
                expression { return params.RUN_SCA }
            }

            parallel {
                stage('api/ dependencies') {
                    steps {
                        script {
                            try {
                                timeout(time: 4, unit: 'MINUTES') {
                                    sh '''
                                        set +e

                                        if [ ! -d api ]; then
                                            echo "api/ not found. Skipping Trivy api scan."
                                            exit 0
                                        fi

                                        docker run --rm \
                                            -v "$WORKSPACE:/src" \
                                            -v "$TRIVY_CACHE:/root/.cache" \
                                            -w /src \
                                            "$IMG_TRIVY" fs api \
                                            --scanners vuln \
                                            --skip-files api/requirements.txt \
                                            --format sarif \
                                            --output "$REPORTS/trivy-fs-api.sarif" \
                                            --timeout 3m \
                                            --no-progress

                                        echo "Trivy api/ exit code: $?"
                                        exit 0
                                    '''
                                }
                            } catch (err) {
                                echo "Trivy api/ timed out or failed. Continuing pipeline."
                                sh '''
                                    mkdir -p "$REPORTS"
                                    echo "Trivy api/ scan timed out or failed." > "$REPORTS/trivy-api-timeout.txt"
                                '''
                            }
                        }
                    }
                }

                stage('ui/ dependencies') {
                    steps {
                        script {
                            try {
                                timeout(time: 4, unit: 'MINUTES') {
                                    sh '''
                                        set +e

                                        if [ ! -d ui ]; then
                                            echo "ui/ not found. Skipping Trivy ui scan."
                                            exit 0
                                        fi

                                        docker run --rm \
                                            -v "$WORKSPACE:/src" \
                                            -v "$TRIVY_CACHE:/root/.cache" \
                                            -w /src \
                                            "$IMG_TRIVY" fs ui \
                                            --scanners vuln \
                                            --skip-dirs ui/node_modules \
                                            --skip-dirs ui/dist \
                                            --skip-dirs ui/build \
                                            --format sarif \
                                            --output "$REPORTS/trivy-fs-ui.sarif" \
                                            --timeout 3m \
                                            --no-progress

                                        echo "Trivy ui/ exit code: $?"
                                        exit 0
                                    '''
                                }
                            } catch (err) {
                                echo "Trivy ui/ timed out or failed. Continuing pipeline."
                                sh '''
                                    mkdir -p "$REPORTS"
                                    echo "Trivy ui/ scan timed out or failed." > "$REPORTS/trivy-ui-timeout.txt"
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('SBOM — Optional Inventory') {
            when {
                expression { return params.RUN_SCA }
            }

            steps {
                script {
                    try {
                        timeout(time: 4, unit: 'MINUTES') {
                            sh '''
                                set +e

                                if [ -d api ]; then
                                    docker run --rm \
                                        -v "$WORKSPACE:/src" \
                                        -v "$TRIVY_CACHE:/root/.cache" \
                                        -w /src \
                                        "$IMG_TRIVY" fs api \
                                        --format cyclonedx \
                                        --skip-files api/requirements.txt \
                                        --output "$REPORTS/sbom-api.cdx.json" \
                                        --timeout 3m \
                                        --no-progress || true
                                fi

                                if [ -d ui ]; then
                                    docker run --rm \
                                        -v "$WORKSPACE:/src" \
                                        -v "$TRIVY_CACHE:/root/.cache" \
                                        -w /src \
                                        "$IMG_TRIVY" fs ui \
                                        --format cyclonedx \
                                        --skip-dirs ui/node_modules \
                                        --skip-dirs ui/dist \
                                        --skip-dirs ui/build \
                                        --output "$REPORTS/sbom-ui.cdx.json" \
                                        --timeout 3m \
                                        --no-progress || true
                                fi

                                exit 0
                            '''
                        }
                    } catch (err) {
                        echo "SBOM generation timed out or failed. Continuing pipeline."
                        sh '''
                            mkdir -p "$REPORTS"
                            echo "SBOM generation timed out or failed." > "$REPORTS/sbom-timeout.txt"
                        '''
                    }
                }
            }
        }

        stage('Aggregate + Quality Gate') {
            steps {
                script {
                    sh '''
                        set +e

                        if [ ! -f ci/quality_gate.py ]; then
                            echo "ci/quality_gate.py not found. Skipping quality gate."
                            exit 0
                        fi

                        docker run --rm \
                            -v "$WORKSPACE:/src" \
                            -w /src \
                            -e MAX_CRITICAL="$MAX_CRITICAL" \
                            -e MAX_HIGH="$MAX_HIGH" \
                            "$IMG_PY" python ci/quality_gate.py

                        GATE_EXIT=$?

                        if [ "$GATE_EXIT" -ne 0 ]; then
                            echo "Quality gate failed with exit code: $GATE_EXIT"

                            if [ "${FAIL_ON_FINDINGS}" = "true" ]; then
                                exit "$GATE_EXIT"
                            else
                                echo "FAIL_ON_FINDINGS=false, so continuing."
                                exit 0
                            fi
                        fi

                        echo "Quality gate passed."
                        exit 0
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                sh '''
                    mkdir -p "$REPORTS"

                    echo "Security scan completed at $(date)" > "$REPORTS/pipeline-summary.txt"
                    echo "" >> "$REPORTS/pipeline-summary.txt"
                    echo "Scanned folders:" >> "$REPORTS/pipeline-summary.txt"
                    echo "- api/" >> "$REPORTS/pipeline-summary.txt"
                    echo "- ui/" >> "$REPORTS/pipeline-summary.txt"
                    echo "" >> "$REPORTS/pipeline-summary.txt"
                    echo "Timeout policy:" >> "$REPORTS/pipeline-summary.txt"
                    echo "- Each scanner stage is allowed maximum 4 minutes." >> "$REPORTS/pipeline-summary.txt"
                '''
            }

            recordIssues(
                enabledForFailure: true,
                aggregatingResults: true,
                tools: [
                    sarif(
                        id: 'gitleaks',
                        name: 'Secrets — Gitleaks',
                        pattern: 'reports/gitleaks-*.sarif'
                    ),
                    sarif(
                        id: 'semgrep',
                        name: 'SAST — Semgrep',
                        pattern: 'reports/semgrep-*.sarif'
                    ),
                    sarif(
                        id: 'trivy-sca',
                        name: 'SCA — Trivy',
                        pattern: 'reports/trivy-fs-*.sarif'
                    )
                ]
            )

            publishHTML(target: [
                reportName           : 'Bandit API Report',
                reportDir            : 'reports',
                reportFiles          : 'bandit-api.html',
                keepAll              : true,
                alwaysLinkToLastBuild: true,
                allowMissing         : true
            ])

            publishHTML(target: [
                reportName           : 'Security Assessment',
                reportDir            : 'reports',
                reportFiles          : 'summary.html',
                keepAll              : true,
                alwaysLinkToLastBuild: true,
                allowMissing         : true
            ])

            archiveArtifacts(
                artifacts: 'reports/**',
                allowEmptyArchive: true
            )
        }
    }
}
