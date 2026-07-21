#!/usr/bin/env ruby

require "base64"
require "json"
require "net/http"
require "openssl"
require "uri"

API_ROOT = "https://api.appstoreconnect.apple.com"

def b64url(value)
  Base64.urlsafe_encode64(value, padding: false)
end

def jwt_token
  now = Time.now.to_i
  header = { alg: "ES256", kid: ENV.fetch("APP_STORE_CONNECT_API_KEY_ID"), typ: "JWT" }
  payload = {
    iss: ENV.fetch("APP_STORE_CONNECT_API_ISSUER_ID"),
    iat: now,
    exp: now + 1_100,
    aud: "appstoreconnect-v1"
  }
  signing_input = "#{b64url(header.to_json)}.#{b64url(payload.to_json)}"
  key = OpenSSL::PKey::EC.new(ENV.fetch("APP_STORE_CONNECT_API_KEY_CONTENT"))
  der_signature = key.dsa_sign_asn1(OpenSSL::Digest::SHA256.digest(signing_input))
  sequence = OpenSSL::ASN1.decode(der_signature)
  raw_signature = sequence.value.map { |part| part.value.to_s(16).rjust(64, "0") }.join
  "#{signing_input}.#{b64url([raw_signature].pack("H*"))}"
end

def request(method, path, body = nil)
  uri = URI.join(API_ROOT, path)
  request_class = {
    get: Net::HTTP::Get,
    post: Net::HTTP::Post
  }.fetch(method)
  req = request_class.new(uri)
  req["Authorization"] = "Bearer #{jwt_token}"
  req["Content-Type"] = "application/json"
  req.body = JSON.generate(body) if body
  response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
  parsed = response.body.to_s.empty? ? {} : JSON.parse(response.body)
  return parsed if response.is_a?(Net::HTTPSuccess)

  detail = parsed.fetch("errors", []).map { |error| error["detail"] || error["title"] }.compact.join("; ")
  raise "App Store Connect #{response.code}: #{detail.empty? ? response.body : detail}"
end

def find_build(app_id, build_number)
  query = URI.encode_www_form(
    "filter[app]" => app_id,
    "filter[version]" => build_number,
    "sort" => "-uploadedDate",
    "limit" => "1"
  )
  request(:get, "/v1/builds?#{query}").fetch("data", []).first
end

def wait_for_build(app_id, build_number)
  timeout_at = Time.now + Integer(ENV.fetch("PROCESSING_TIMEOUT_SECONDS", "1800"))
  loop do
    build = find_build(app_id, build_number)
    if build
      state = build.dig("attributes", "processingState")
      puts "Build #{build_number} processing state: #{state}"
      return build if state == "VALID"
      raise "Build #{build_number} processing failed with state #{state}" if %w[FAILED INVALID].include?(state)
    else
      puts "Build #{build_number} is not visible yet"
    end
    raise "Timed out waiting for build #{build_number}" if Time.now >= timeout_at
    sleep 30
  end
end

def add_build_to_group(build_id, group_id)
  body = { data: [{ type: "builds", id: build_id }] }
  request(:post, "/v1/betaGroups/#{group_id}/relationships/builds", body)
  puts "Assigned build to beta group #{group_id}"
rescue StandardError => error
  raise unless error.message.include?("already") || error.message.include?("409")
  puts "Build is already assigned to beta group #{group_id}"
end

def find_tester(email)
  query = URI.encode_www_form("filter[email]" => email, "limit" => "1")
  request(:get, "/v1/betaTesters?#{query}").fetch("data", []).first
end

def add_tester_to_group(tester_id, group_id)
  body = { data: [{ type: "betaGroups", id: group_id }] }
  request(:post, "/v1/betaTesters/#{tester_id}/relationships/betaGroups", body)
  puts "Assigned existing tester to beta group #{group_id}"
rescue StandardError => error
  raise unless error.message.include?("already") || error.message.include?("409")
  puts "Tester is already assigned to beta group #{group_id}"
end

def invite_tester(email, group_id)
  tester = find_tester(email)
  return add_tester_to_group(tester.fetch("id"), group_id) if tester

  body = {
    data: {
      type: "betaTesters",
      attributes: { email: email, firstName: "WarRescue", lastName: "Tester" },
      relationships: { betaGroups: { data: [{ type: "betaGroups", id: group_id }] } }
    }
  }
  request(:post, "/v1/betaTesters", body)
  puts "Invited #{email} to beta group #{group_id}"
end

app_id = ENV.fetch("APP_STORE_APP_ID")
group_id = ENV.fetch("TESTFLIGHT_GROUP_ID")
build_number = ENV.fetch("TESTFLIGHT_BUILD_NUMBER")
tester_email = ENV.fetch("TESTER_EMAIL")

build = wait_for_build(app_id, build_number)
add_build_to_group(build.fetch("id"), group_id)
invite_tester(tester_email, group_id)

