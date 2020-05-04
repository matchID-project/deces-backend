#!/bin/bash
echo "GET--->"
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&firstName=Harry | grep -q 'name":{"first":\["Harry'; then
    echo "firstName: OK"
else
    echo -e "\e[31mfirstName: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&lastName=Pottier | grep -q 'last":"Pottier"'; then
    echo "lastName: OK"
else
    echo -e "\e[31mlastName: KO!\e[0m"
    exit 1
fi
if curl -s  -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&birthCountry=France | grep -q 'country":"France"'; then
    echo "birthCountry: OK"
else
    echo -e "\e[31mbirthCountry: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&deathCountry=Argentine | grep -q 'country":"Argentine"'; then
    echo "deathCountry: OK"
else
    echo -e "\e[31mdeathCountry: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&birthDate=23/01/1928 | grep -q '20200128'; then
    echo "birthDate: OK"
else
    echo -e "\e[31mbirthDate: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=22/01/2020 | grep -q '20200122'; then
    echo "deathDate: OK"
else
    echo -e "\e[31mdeathDate: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=22/01/2020-30/01/2020 | grep -q 'persons":\[{'; then
    echo "dateRangeDate: OK"
else
    echo -e "\e[31mdateRangeDate: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&birthCity=Metz | grep -q '"city":"Metz"'; then
    echo "birthCity: OK"
else
    echo -e "\e[31mbirthCity: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&deathCity=Nice | grep -q 'city":"Nice"'; then
    echo "deathCity: OK"
else
    echo -e "\e[31mdeathCity: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&birthDepartment=57 | grep -q 'departmentCode":"57"'; then
    echo "birthDepartment: OK"
else
    echo -e "\e[31mbirthDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&deathDepartment=75 | grep -q 'departmentCode":"75"'; then
    echo "deathDepartment: OK"
else
    echo -e "\e[31mdeathDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&firstName=Ana\&fuzzy=false | grep -q '"response":{"total":10' ; then
    echo "fuzzy: OK"
else
    echo -e "\e[31mfuzzy: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?q=Michel+Rojo+02%2F08%2F2020 | grep -q 'Rojo' ; then
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
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?birthDate=19 | grep -q 'invalid birthDate' ; then
    echo "field content error: OK"
else
    echo -e "\e[31mfield content error: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?birthDate=2020\&q=Georges | grep -q 'simple and complex request' ; then
    echo "simple and complex request error: OK"
else
    echo -e "\e[31msimple and complex request error: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&deathAge=20 | grep -q 'persons":\[{'; then
    echo "DeathAge: OK"
else
    echo -e "\e[31mDeathAge: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=2020\&sex=M | grep -q --invert-match 'sex":"F"'; then
    echo "sex: OK"
else
    echo -e "\e[31msex: KO!\e[0m"
    exit 1
fi
scrollId=$(curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?firstName=Jean\&scroll=1m | grep -Po 'scrollId":"\K.*?(?=")')
echo First scrollId is $scrollId
curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?scrollId=$scrollId\&scroll=1m | grep -Po 'scrollId":"\K.*?(?=")'
if [ ! -z "$scrollId" ]; then \
    #while [ -n "$scrollId" ]; do
    #    scrollId=$(curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?scrollId=$scrollId\&scroll=1m | grep -Po 'scrollId":"\K.*?(?=")')
    #    echo Token $scrollId
    #done
    echo "scroll: OK"
else
    echo -e "\e[31mscroll: KO!\e[0m"
fi
echo "POST--->"
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","firstName": "Harry"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'name":{"first":\["Harry'; then
    echo "firstName: OK"
else
    echo -e "\e[31mfirstName: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","lastName": "Pottier"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'last":"Pottier"'; then
    echo "lastName: OK"
else
    echo -e "\e[31mlastName: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","birthCountry": "France"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'country":"France"'; then
    echo "birthCountry: OK"
else
    echo -e "\e[31mbirthCountry: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2019", "birthGeoPoint":{"latitude":49.6,"longitude":2.98,"distance":"10km"}}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '"city":"Dijon"'; then
    echo "birthGeoPoint: OK"
else
    echo -e "\e[31mbirthGeoPoint: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","deathCountry": "Argentine"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'country":"Argentine"'; then
    echo "deathCountry: OK"
else
    echo -e "\e[31mdeathCountry: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","deathGeoPoint":{"latitude":48.5,"longitude":3.4,"distance":"10km"}}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'cityCode":"10268"'; then
    echo "deathGeoPoint: OK"
else
    echo -e "\e[31mdeathGeoPoint: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","birthDate": "23/01/1930"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '20200128'; then
    echo "birthDate: OK"
else
    echo -e "\e[31mbirthDate: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate": "22/02/2020"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '20200122'; then
    echo "deathDate: OK"
else
    echo -e "\e[31mdeathDate: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","birthCity": "Metz"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '"city":"Metz"'; then
    echo "birthCity: OK"
else
    echo -e "\e[31mbirthCity: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","deathCity": "Nice"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'city":"Nice"'; then
    echo "deathCity: OK"
else
    echo -e "\e[31mdeathCity: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","birthDepartment": "57"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'departmentCode":"57"'; then
    echo "birthDepartment: OK"
else
    echo -e "\e[31mbirthDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","deathDepartment": "75"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'departmentCode":"75"'; then
    echo "deathDepartment: OK"
else
    echo -e "\e[31mdeathDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"20/01/2020-31/01/2020"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'persons":\[{'; then
    echo "deathRangeDate: OK"
else
    echo -e "\e[31mdeathRangeDate: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020", "deathAge": "20-22"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'persons":\[{'; then
    echo "DeathAge: OK"
else
    echo -e "\e[31mDeathAge: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: text/plain" -d '{"deathDate": "2020", "sex": "M"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q --invert-match 'sex":"F"'; then
    echo "sex: OK"
else
    echo -e "\e[31msex: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","firstName": "Ana", "fuzzy": "false"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '"response":{"total":10' ; then
    echo "fuzzy: OK"
else
    echo -e "\e[31mfuzzy: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"q": "Michel Rojo 02/08/2020"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Rojo'; then
    echo "fullText: OK"
else
    echo -e "\e[31mfullText: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"2020","lastName": "Rojo", "sort": [{"firstName": "asc"}]}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Rojo'; then
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
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate": "2020", "q": "Georges"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -qi 'simple and complex request'; then
    echo "simple and complex request: OK"
else
    echo -e "\e[31msimple and complex request: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"firstName": "Inconnu"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -qi 'persons":\[\]'; then
    echo "inconnu: OK"
else
    echo -e "\e[31minconnu: KO!\e[0m"
    exit 1
fi
scrollId=$(curl -s -X POST -H "Content-Type: application/json" -d '{"firstName": "Jean", "scroll": "1m"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -Po 'scrollId":"\K.*?(?=")')
if [ ! -z "$scrollId" ]; then \
    #    while [ -n "$scrollId" ]; do
    #        scrollId=$(curl -s -X POST -H "Content-Type: application/json" -d '{"scroll": "1m", "scrollId": "$scrollId"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -Po 'scrollId":"\K.*?(?=")')
    #        echo Token $scrollId
    #done
    echo "scroll: OK"
else
    echo -e "\e[31mscroll: KO!\e[0m"
fi
