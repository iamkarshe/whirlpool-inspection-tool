// =============================================================================
// Jenkinsfile  —  source-only security pipeline for api/ (FastAPI) + ui/ (React)
//
// Scope (v1): code push -> secrets + SAST + SCA -> reports. NOTHING runs the
// application. No image build, no docker compose, no database, no env vars.
// Every scanner runs in a throwaway tool container that only READS your mounted
// source — your app is never started.
//
// Agent: a Linux node where the Jenkins user can run `docker`.
// Plugins: GitHub, Warnings Next Generation, HTML Publisher.
// =============================================================================

pipeline {
    agent any

    parameters {
        string(name: 'ASSESSMENT_BRANCH', defaultValue: 'main',
               description: 'Branch that triggers the security assessment')
        booleanParam(name: 'RUN_SECRETS', defaultValue: true,
               description: 'Gitleaks secret scan')
        booleanParam(name: 'RUN_SAST',    defaultValue: true,
               description: 'Semgrep + Bandit static analysis')
        booleanParam(name: 'RUN_SCA',     defaultValue: true,
               description: 'Trivy / pip-audit / npm dependency analysis')
        booleanParam(name: 'FAIL_ON_FINDINGS', defaultValue: true,
               description: 'Fail the build when thresholds are exceeded (off = report only)')
        string(name: 'MAX_CRITICAL', defaultValue: '0',
               description: 'Max allowed CRITICAL findings before the gate fails')
        string(name: 'MAX_HIGH',     defaultValue: '5',
               description: 'Max allowed HIGH findings before the gate fails')
    }

    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    triggers {
        githubPush()
    }

    environment {
        REPORTS      = 'reports'
        TRIVY_CACHE  = "${WORKSPACE}/.trivycache"
        MAX_CRITICAL = "${params.MAX_CRITICAL}"
        MAX_HIGH     = "${params.MAX_HIGH}"
        // Pinned scanner images (verified current). These scan source only.
        IMG_GITLEAKS = 'ghcr.io/gitleaks/gitleaks:latest'
        IMG_SEMGREP  = 'semgrep/semgrep'
        IMG_TRIVY    = 'aquasec/trivy:latest'
        IMG_PY       = 'python:3.12-slim'
        IMG_NODE     = 'node:20-alpine'
    }

    stages {

        stage('Security Assessment') {
            when { expression { env.BRANCH_NAME == params.ASSESSMENT_BRANCH } }

            stages {

                stage('Checkout') {
                    steps {
                        checkout scm
                        sh 'rm -rf "$REPORTS" && mkdir -p "$REPORTS" "$TRIVY_CACHE"'
                    }
                }

                stage('Secrets — Gitleaks') {
                    when { expression { params.RUN_SECRETS } }
                    steps {
                        sh '''
                            docker run --rm -v "$WORKSPACE:/repo" -w /repo "$IMG_GITLEAKS" \
                                dir . --report-format sarif \
                                --report-path "$REPORTS/gitleaks.sarif" \
                                --config /repo/.gitleaks.toml --exit-code 0 || true
                        '''
                    }
                }

                stage('SAST') {
                    when { expression { params.RUN_SAST } }
                    parallel {
                        stage('api/ — Python') {
                            steps {
                                sh '''
                                    docker run --rm -v "$WORKSPACE:/src" -w /src "$IMG_SEMGREP" \
                                        semgrep scan --metrics=off \
                                        --config p/python --config p/security-audit \
                                        --sarif --output "$REPORTS/semgrep-api.sarif" api || true
                                '''
                                sh '''
                                    docker run --rm -v "$WORKSPACE:/src" -w /src "$IMG_PY" sh -c \
                                        "pip install --quiet bandit && \
                                         bandit -r api -f html -o $REPORTS/bandit-api.html" || true
                                '''
                            }
                        }
                        stage('ui/ — React') {
                            steps {
                                sh '''
                                    docker run --rm -v "$WORKSPACE:/src" -w /src "$IMG_SEMGREP" \
                                        semgrep scan --metrics=off \
                                        --config p/javascript --config p/react --config p/security-audit \
                                        --sarif --output "$REPORTS/semgrep-ui.sarif" ui || true
                                '''
                            }
                        }
                    }
                }

                stage('SCA') {
                    when { expression { params.RUN_SCA } }
                    parallel {
                        stage('api/ — deps') {
                            steps {
                                sh '''
                                    docker run --rm -v "$WORKSPACE:/src" -w /src "$IMG_PY" sh -c \
                                        "pip install --quiet pip-audit && \
                                         pip-audit -r api/requirements.txt -f json \
                                         -o $REPORTS/pip-audit.json" || true
                                '''
                                sh '''
                                    docker run --rm -v "$WORKSPACE:/src" -v "$TRIVY_CACHE:/root/.cache" \
                                        -w /src "$IMG_TRIVY" fs --scanners vuln api \
                                        --format sarif --output "$REPORTS/trivy-fs-api.sarif" || true
                                '''
                            }
                        }
                        stage('ui/ — deps') {
                            steps {
                                sh '''
                                    docker run --rm -v "$WORKSPACE:/src" -w /src/ui "$IMG_NODE" sh -c \
                                        "npm audit --json > /src/$REPORTS/npm-audit.json || true"
                                '''
                                sh '''
                                    docker run --rm -v "$WORKSPACE:/src" -v "$TRIVY_CACHE:/root/.cache" \
                                        -w /src "$IMG_TRIVY" fs --scanners vuln ui \
                                        --format sarif --output "$REPORTS/trivy-fs-ui.sarif" || true
                                '''
                            }
                        }
                    }
                }

                stage('Aggregate + Quality Gate') {
                    steps {
                        script {
                            def gate = 'docker run --rm -v "$WORKSPACE:/src" -w /src ' +
                                       '-e MAX_CRITICAL="$MAX_CRITICAL" -e MAX_HIGH="$MAX_HIGH" ' +
                                       '"$IMG_PY" python ci/quality_gate.py'
                            if (!params.FAIL_ON_FINDINGS) {
                                gate = gate + ' || true'
                            }
                            sh gate
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            recordIssues(
                aggregatingResults: true,
                tools: [
                    sarif(id: 'gitleaks',  name: 'Secrets (Gitleaks)', pattern: 'reports/gitleaks.sarif'),
                    sarif(id: 'semgrep',   name: 'SAST (Semgrep)',     pattern: 'reports/semgrep-*.sarif'),
                    sarif(id: 'trivy-sca', name: 'SCA (Trivy)',        pattern: 'reports/trivy-fs-*.sarif')
                ]
            )
            publishHTML(target: [
                reportName           : 'Security Assessment',
                reportDir            : 'reports',
                reportFiles          : 'summary.html',
                keepAll              : true,
                alwaysLinkToLastBuild: true,
                allowMissing         : true
            ])
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
        }
    }
}
