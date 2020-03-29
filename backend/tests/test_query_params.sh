echo "GET--->"
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&firstName=Harry | grep -q 'Harry'; then
    echo "firstName: OK"
else
    echo -e "\e[31mfirstName: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&lastName=Pottier | grep -q 'Pottier'; then
    echo "lastName: OK"
else
    echo -e "\e[31mlastName: KO!\e[0m"
    exit 1
fi
if curl -s  -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&birthCountry=France | grep -q 'France'; then
    echo "birthCountry: OK"
else
    echo -e "\e[31mbirthCountry: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&deathCountry=Colombie | grep -q 'Colombie'; then
    echo "deathCountry: OK"
else
    echo -e "\e[31mdeathCountry: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&birthDate=28/03/1930 | grep -q '19300328'; then
    echo "birthDate: OK"
else
    echo -e "\e[31mbirthDate: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=22/02/1970 | grep -q '19700222'; then
    echo "deathDate: OK"
else
    echo -e "\e[31mdeathDate: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&birthCity=Metz | grep -q 'Metz'; then
    echo "birthCity: OK"
else
    echo -e "\e[31mbirthCity: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&deathCity=Nice | grep -q 'Nice'; then
    echo "deathCity: OK"
else
    echo -e "\e[31mdeathCity: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&birthDepartment=57 | grep -q '57'; then
    echo "birthDepartment: OK"
else
    echo -e "\e[31mbirthDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&deathDepartment=75 | grep -q '75'; then
    echo "deathDepartment: OK"
else
    echo -e "\e[31mdeathDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&firstName=Ana\&fuzzy=false | grep -q '"response":{"total":2' ; then
    echo "fuzzy: OK"
else
    echo -e "\e[31mfuzzy: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?q=Michel+Bosq+02%2F08%2F1970 | grep -q 'Bosq' ; then
    echo "fullText: OK"
else
    echo -e "\e[31mfullText: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'error' ; then
    echo "empty request: OK"
else
    echo -e "\e[31mempty request: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?bob=pop | grep -q 'error' ; then
    echo "wrong field: OK"
else
    echo -e "\e[31mwrong field: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?birthDate=19 | grep -q 'field content error' ; then
    echo "field content error: OK"
else
    echo -e "\e[31mfield content error: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?birthDate=1970\&q=Georges | grep -q 'simple and complex request' ; then
    echo "simple and complex request error: OK"
else
    echo -e "\e[31msimple and complex request error: KO!\e[0m"
    exit 1
fi
echo "POST--->"
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","firstName": "Harry"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Harry'; then
    echo "firstName: OK"
else
    echo -e "\e[31mfirstName: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","lastName": "Pottier"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Pottier'; then
    echo "lastName: OK"
else
    echo -e "\e[31mlastName: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","birthCountry": "France"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'France'; then
    echo "birthCountry: OK"
else
    echo -e "\e[31mbirthCountry: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","deathCountry": "Colombie"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Colombie'; then
    echo "deathCountry: OK"
else
    echo -e "\e[31mdeathCountry: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","birthDate": "28/03/1930"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '19300328'; then
    echo "birthDate: OK"
else
    echo -e "\e[31mbirthDate: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate": "22/02/1970"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '19700222'; then
    echo "deathDate: OK"
else
    echo -e "\e[31mdeathDate: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","birthCity": "Metz"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Metz'; then
    echo "birthCity: OK"
else
    echo -e "\e[31mbirthCity: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","deathCity": "Nice"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Nice'; then
    echo "deathCity: OK"
else
    echo -e "\e[31mdeathCity: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","birthDepartment": "57"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '57'; then
    echo "birthDepartment: OK"
else
    echo -e "\e[31mbirthDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","deathDepartment": "75"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '75'; then
    echo "deathDepartment: OK"
else
    echo -e "\e[31mdeathDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","firstName": "Ana", "fuzzy": "false"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '"response":{"total":2' ; then
    echo "fuzzy: OK"
else
    echo -e "\e[31mfuzzy: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"q": "Michel Bosq 02/08/1970"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Bosq'; then
    echo "fullText: OK"
else
    echo -e "\e[31mfullText: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","lastName": "Bosq", "sort": [{"firstName": "asc"}]}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Bosq'; then
    echo "sort: OK"
else
    echo -e "\e[31msort: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'error'; then
    echo "empty query: OK"
else
    echo -e "\e[31mempty query: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'error'; then
    echo "empty query: OK"
else
    echo -e "\e[31mempty query: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: text/plain" -d '{"q": "Georges"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'error'; then
    echo "wrong content type: OK"
else
    echo -e "\e[31mwrong content type: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"q: "Georges"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -qi 'bad json'; then
    echo "bad JSON format: OK"
else
    echo -e "\e[31mbad JSON format: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"bob": "pop"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -qi 'unknown field'; then
    echo "unknown field: OK"
else
    echo -e "\e[31munknown field: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate": "19"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -qi 'field content'; then
    echo "field content error: OK"
else
    echo -e "\e[31mfield content error: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate": "1970", "q": "Georges"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -qi 'simple and complex request'; then
    echo "simple and complex request: OK"
else
    echo -e "\e[31msimple and complex request: KO!\e[0m"
    exit 1
fi
